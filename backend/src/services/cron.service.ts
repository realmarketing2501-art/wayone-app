import cron from 'node-cron';
import { db } from '../config/database';
import { getSettings } from './settings.service';

interface LevelConfig {
  code: string;
  daily_rate: string;
  network_bonus: string;
  required_direct: number;
  required_total_team: number;
  sort_order: number;
}

async function getLevelConfigs(): Promise<LevelConfig[]> {
  const res = await db.query(
    `SELECT code, daily_rate, network_bonus, required_direct, required_total_team, sort_order
     FROM qualification_levels WHERE is_active = TRUE ORDER BY sort_order ASC`
  );
  return res.rows;
}

async function calculateDailyReturns() {
  console.log('⏰ Cron: calcolo rendimenti giornalieri...');
  try {
    const [investments, levels] = await Promise.all([
      db.query(
        `SELECT i.id, i.user_id, i.amount, i.daily_rate, u.level, u.is_suspended
         FROM investments i
         JOIN users u ON i.user_id = u.id
         WHERE i.status = 'active' AND u.is_suspended = FALSE`
      ),
      getLevelConfigs(),
    ]);

    const levelMap = Object.fromEntries(levels.map((l) => [l.code, Number(l.daily_rate)]));

    for (const inv of investments.rows) {
      const fallbackRate = Number(inv.daily_rate) / 100;
      const levelRate = levelMap[inv.level] ?? fallbackRate;
      const dailyReturn = Number(inv.amount) * levelRate;

      await db.query('UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2', [dailyReturn, inv.user_id]);
      await db.query('UPDATE investments SET total_earned = total_earned + $1, last_payout = NOW() WHERE id = $2', [dailyReturn, inv.id]);
      await db.query(
        `INSERT INTO income_log (id, user_id, amount, type, source_id, description)
         VALUES (uuid_generate_v4(), $1, $2, 'daily_return', $3, $4)`,
        [inv.user_id, dailyReturn, inv.id, `Rendimento giornaliero ${(levelRate * 100).toFixed(2)}%`]
      );
    }

    await calculateNetworkBonuses(levels);
    console.log(`✅ Rendimenti calcolati per ${investments.rows.length} investimenti`);
  } catch (e) {
    console.error('❌ Errore cron daily returns:', e);
  }
}

async function calculateNetworkBonuses(levels: LevelConfig[]) {
  const bonusMap = Object.fromEntries(levels.map((l) => [l.code, Number(l.network_bonus)]));
  const users = await db.query(`SELECT id, level FROM users WHERE is_suspended = FALSE AND level != 'PRE'`);
  for (const user of users.rows) {
    const bonusRate = bonusMap[user.level];
    if (!bonusRate) continue;
    const directReturns = await db.query(
      `SELECT COALESCE(SUM(il.amount), 0) AS total
       FROM income_log il
       JOIN network_tree nt ON il.user_id = nt.user_id
       WHERE nt.parent_id = $1 AND il.type = 'daily_return' AND DATE(il.created_at) = CURRENT_DATE`,
      [user.id]
    );
    const bonus = Number(directReturns.rows[0].total) * bonusRate;
    if (bonus > 0) {
      await db.query('UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2', [bonus, user.id]);
      await db.query(
        `INSERT INTO income_log (id, user_id, amount, type, description)
         VALUES (uuid_generate_v4(), $1, $2, 'network_bonus', $3)`,
        [user.id, bonus, `Network bonus ${(bonusRate * 100).toFixed(0)}% - ${user.level}`]
      );
    }
  }
}

async function checkTRC20Deposits() {
  const settings = await getSettings();
  const wallet = settings['company_wallet_trc20'];
  const apiKey = settings['tron_api_key'];
  if (!wallet || !apiKey) return;
  try {
    const url = `https://api.trongrid.io/v1/accounts/${wallet}/transactions/trc20?only_to=true&limit=50&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`;
    const response = await fetch(url, { headers: { 'TRON-PRO-API-KEY': apiKey } });
    if (!response.ok) return;
    const data = await response.json() as { data: { transaction_id: string; from: string; value: string }[] };
    for (const tx of data.data ?? []) {
      const existing = await db.query('SELECT id FROM deposits WHERE tx_hash = $1', [tx.transaction_id]);
      if (existing.rows.length > 0) continue;
      const amount = parseInt(tx.value) / 1e6;
      const pending = await db.query(
        `UPDATE deposits SET tx_hash = $1, from_address = $2, status = 'confirmed', confirmed_at = NOW()
         WHERE status = 'pending' AND amount = $3 AND network = 'TRC-20'
         RETURNING user_id, amount`,
        [tx.transaction_id, tx.from, amount]
      );
      if (pending.rows.length > 0) {
        const { user_id, amount: amt } = pending.rows[0];
        await db.query('UPDATE users SET balance = balance + $1, total_invested = total_invested + $1 WHERE id = $2', [amt, user_id]);
      }
    }
  } catch (e) {
    console.error('❌ Errore monitoraggio TRC-20:', e);
  }
}

async function checkQualificationUpgrades() {
  try {
    const [users, levels] = await Promise.all([
      db.query('SELECT id, level FROM users WHERE is_suspended = FALSE'),
      getLevelConfigs(),
    ]);
    const ordered = levels.sort((a, b) => a.sort_order - b.sort_order);
    for (const user of users.rows) {
      const direct = await db.query(`SELECT COUNT(*) AS cnt FROM network_tree WHERE parent_id = $1 AND level = 1 AND is_active = TRUE`, [user.id]);
      const total = await db.query(
        `WITH RECURSIVE tree AS (
           SELECT user_id FROM network_tree WHERE parent_id = $1
           UNION ALL
           SELECT nt.user_id FROM network_tree nt INNER JOIN tree t ON nt.parent_id = t.user_id
         ) SELECT COUNT(*) AS cnt FROM tree`,
        [user.id]
      );
      const d = parseInt(direct.rows[0].cnt);
      const t = parseInt(total.rows[0].cnt);
      let newLevel = user.level;
      for (const level of ordered) {
        if (d >= Number(level.required_direct) && t >= Number(level.required_total_team)) newLevel = level.code;
      }
      if (newLevel !== user.level) {
        await db.query('UPDATE users SET level = $1 WHERE id = $2', [newLevel, user.id]);
      }
    }
  } catch (e) {
    console.error('❌ Errore cron level check:', e);
  }
}

async function resetDailyTasks() {
  try {
    await db.query(`DELETE FROM user_tasks WHERE task_id IN (SELECT id FROM tasks_missions WHERE task_type = 'daily')`);
  } catch (e) {
    console.error('❌ Errore reset task:', e);
  }
}

export function startCronJobs() {
  cron.schedule('0 0 * * *', calculateDailyReturns);
  cron.schedule('*/2 * * * *', checkTRC20Deposits);
  cron.schedule('0 * * * *', checkQualificationUpgrades);
  cron.schedule('0 0 * * *', resetDailyTasks);
  console.log('✅ Cron jobs avviati');
}
