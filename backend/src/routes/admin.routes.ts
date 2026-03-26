import { invalidateCache } from '../services/settings.service';
import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware to check admin
async function requireAdmin(req: AuthRequest, res: any, next: any) {
  const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);
  if (!result.rows[0]?.is_admin) return res.status(403).json({ error: 'Accesso negato' });
  next();
}

// ─── DASHBOARD ──────────────────────────────────────────────
router.get('/dashboard', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const [totalUsers, activeUsers, totalDeposited, totalWithdrawn,
      pendingW, pendingD, pendingKyc, levelDist, recentSignups] = await Promise.all([
      db.query('SELECT COUNT(*) AS cnt FROM users'),
      db.query("SELECT COUNT(*) AS cnt FROM users WHERE is_suspended = FALSE"),
      db.query("SELECT COALESCE(SUM(amount),0) AS total FROM deposits WHERE status = 'confirmed'"),
      db.query("SELECT COALESCE(SUM(net_amount),0) AS total FROM withdrawals WHERE status = 'completed'"),
      db.query("SELECT COUNT(*) AS cnt, COALESCE(SUM(amount),0) AS total FROM withdrawals WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) AS cnt FROM deposits WHERE status = 'pending'"),
      db.query("SELECT COUNT(*) AS cnt FROM users WHERE kyc_status = 'pending'"),
      db.query('SELECT level, COUNT(*) AS cnt FROM users GROUP BY level ORDER BY cnt DESC'),
      db.query("SELECT COUNT(*) AS cnt FROM users WHERE created_at > NOW() - INTERVAL '24 hours'"),
    ]);

    res.json({
      totalUsers: parseInt(totalUsers.rows[0].cnt),
      activeUsers: parseInt(activeUsers.rows[0].cnt),
      totalDeposited: parseFloat(totalDeposited.rows[0].total),
      totalWithdrawn: parseFloat(totalWithdrawn.rows[0].total),
      pendingWithdrawalsCount: parseInt(pendingW.rows[0].cnt),
      pendingWithdrawalsTotal: parseFloat(pendingW.rows[0].total),
      pendingDepositsCount: parseInt(pendingD.rows[0].cnt),
      pendingKycCount: parseInt(pendingKyc.rows[0].cnt),
      levelDistribution: levelDist.rows,
      recentSignups: parseInt(recentSignups.rows[0].cnt),
      platformProfit: parseFloat(totalDeposited.rows[0].total) - parseFloat(totalWithdrawn.rows[0].total),
    });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── USERS ──────────────────────────────────────────────────
router.get('/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50');
    const offset = parseInt((req.query.offset as string) || '0');
    const search = (req.query.search as string) || '';
    const level = (req.query.level as string) || '';
    const status = (req.query.status as string) || '';

    let where = 'WHERE 1=1';
    const params: unknown[] = [];
    if (search) { params.push(`%${search}%`); where += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR referral_code ILIKE $${params.length})`; }
    if (level) { params.push(level); where += ` AND level = $${params.length}`; }
    if (status === 'suspended') where += ' AND is_suspended = TRUE';
    if (status === 'active') where += ' AND is_suspended = FALSE';

    const countRes = await db.query(`SELECT COUNT(*) AS cnt FROM users ${where}`, params);
    params.push(limit, offset);
    const users = await db.query(
      `SELECT id, email, full_name, level, balance, total_invested, total_earned,
              total_withdrawn, referral_code, kyc_status, is_admin, is_suspended, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ users: users.rows, total: parseInt(countRes.rows[0].cnt) });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/users/:id/suspend', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT is_suspended FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utente non trovato' });
    const newStatus = !result.rows[0].is_suspended;
    await db.query('UPDATE users SET is_suspended = $1 WHERE id = $2', [newStatus, req.params.id]);
    res.json({ success: true, is_suspended: newStatus });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── DEPOSITS ───────────────────────────────────────────────
router.get('/deposits', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const status = (req.query.status as string) || '';
    const where = status ? `WHERE d.status = '${status}'` : '';
    const result = await db.query(
      `SELECT d.*, u.full_name AS user_name, u.email AS user_email
       FROM deposits d LEFT JOIN users u ON d.user_id = u.id
       ${where} ORDER BY d.created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/deposits/:id/approve', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const deposit = await db.query('SELECT * FROM deposits WHERE id = $1', [req.params.id]);
    if (deposit.rows.length === 0) return res.status(404).json({ error: 'Deposito non trovato' });
    const d = deposit.rows[0];
    await db.query('BEGIN');
    await db.query(
      "UPDATE deposits SET status = 'confirmed', confirmations = 20, confirmed_at = NOW() WHERE id = $1",
      [req.params.id]
    );
    await db.query(
      'UPDATE users SET balance = balance + $1, total_invested = total_invested + $1 WHERE id = $2',
      [d.amount, d.user_id]
    );
    await db.query(
      `INSERT INTO income_log (id, user_id, amount, type, source_id, description)
       VALUES (uuid_generate_v4(), $1, $2, 'deposit', $3, $4)`,
      [d.user_id, d.amount, req.params.id, `Deposito confermato: ${d.amount} USDT`]
    );
    await db.query('COMMIT');
    res.json({ success: true });
  } catch (e: unknown) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/deposits/:id/reject', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await db.query("UPDATE deposits SET status = 'rejected' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── WITHDRAWALS ────────────────────────────────────────────
router.get('/withdrawals', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const status = (req.query.status as string) || '';
    const where = status ? `WHERE w.status = '${status}'` : '';
    const result = await db.query(
      `SELECT w.*, u.full_name AS user_name, u.email AS user_email
       FROM withdrawals w LEFT JOIN users u ON w.user_id = u.id
       ${where} ORDER BY w.created_at DESC LIMIT 200`
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/withdrawals/:id/approve', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { txHash } = req.body;
    const rows = await db.query('SELECT * FROM withdrawals WHERE id = $1', [req.params.id]);
    if (rows.rows.length === 0) return res.status(404).json({ error: 'Prelievo non trovato' });
    await db.query('BEGIN');
    await db.query(
      "UPDATE withdrawals SET status = 'completed', tx_hash = $1, processed_at = NOW(), completed_at = NOW() WHERE id = $2",
      [txHash || '', req.params.id]
    );
    await db.query(
      'UPDATE users SET total_withdrawn = total_withdrawn + $1 WHERE id = $2',
      [rows.rows[0].net_amount, rows.rows[0].user_id]
    );
    await db.query('COMMIT');
    res.json({ success: true });
  } catch (e: unknown) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/withdrawals/:id/reject', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const rows = await db.query('SELECT * FROM withdrawals WHERE id = $1', [req.params.id]);
    if (rows.rows.length === 0) return res.status(404).json({ error: 'Prelievo non trovato' });
    await db.query('BEGIN');
    await db.query(
      "UPDATE withdrawals SET status = 'rejected', admin_note = $1, processed_at = NOW() WHERE id = $2",
      [reason || '', req.params.id]
    );
    // Refund
    await db.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [rows.rows[0].amount, rows.rows[0].user_id]
    );
    await db.query('COMMIT');
    res.json({ success: true });
  } catch (e: unknown) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── SETTINGS ───────────────────────────────────────────────
router.get('/settings', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM admin_settings');
    const settings: Record<string, string> = {};
    result.rows.forEach((r: { key: string; value: string }) => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.put('/settings', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    await db.query(
      `INSERT INTO admin_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value]
    );
    invalidateCache(); // force re-read on next request
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── POPUPS ─────────────────────────────────────────────────
router.get('/popups', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM popup_notifications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/popups', authMiddleware, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { title, message, imageUrl, buttonText, buttonUrl, type, target, targetLevel, priority, expiresAt } = req.body;
    const result = await db.query(
      `INSERT INTO popup_notifications (id, title, message, image_url, target_audience, created_by)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5) RETURNING id`,
      [title, message, imageUrl || null, target || 'all', req.userId]
    );
    res.json({ id: result.rows[0].id });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.put('/popups/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE popup_notifications SET is_active = $1 WHERE id = $2', [status === 'active', req.params.id]);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.delete('/popups/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM popup_notifications WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── NOTIFICATIONS ──────────────────────────────────────────
router.post('/notifications', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const { title, message, type, target } = _req.body;
    await db.query(
      `INSERT INTO notifications (id, title, message, type, target_audience)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4)`,
      [title, message, type || 'info', target || 'all']
    );
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});


// ─── QUALIFICATION LEVELS ──────────────────────────────────
router.get('/levels', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await db.query(`SELECT * FROM qualification_levels ORDER BY sort_order ASC, created_at ASC`);
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/levels', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { code, name, description, daily_rate, network_bonus, required_direct, required_total_team, sort_order, icon, color, is_active } = req.body;
    await db.query(`INSERT INTO qualification_levels (code, name, description, daily_rate, network_bonus, required_direct, required_total_team, sort_order, icon, color, is_active, updated_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`,
      [code, name, description || '', daily_rate, network_bonus || 0, required_direct || 0, required_total_team || 0, sort_order || 0, icon || 'Shield', color || 'badge-neutral', is_active !== false]);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.put('/levels/:code', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { name, description, daily_rate, network_bonus, required_direct, required_total_team, sort_order, icon, color, is_active } = req.body;
    await db.query(`UPDATE qualification_levels SET name=$1, description=$2, daily_rate=$3, network_bonus=$4, required_direct=$5, required_total_team=$6, sort_order=$7, icon=$8, color=$9, is_active=$10, updated_at=NOW() WHERE code=$11`,
      [name, description || '', daily_rate, network_bonus || 0, required_direct || 0, required_total_team || 0, sort_order || 0, icon || 'Shield', color || 'badge-neutral', is_active !== false, req.params.code]);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ─── INVESTMENT PLANS ───────────────────────────────────────
router.get('/investment-plans', authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await db.query(`SELECT * FROM investment_plans ORDER BY sort_order ASC, created_at ASC`);
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/investment-plans', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { slug, name, description, plan_type, daily_rate, min_invest, max_invest, min_level_code, duration_days, sort_order, icon, banner_url, is_active } = req.body;
    await db.query(`INSERT INTO investment_plans (slug, name, description, plan_type, daily_rate, min_invest, max_invest, min_level_code, duration_days, sort_order, icon, banner_url, is_active, updated_at)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())`,
      [slug, name, description || '', plan_type || 'solo', daily_rate, min_invest, max_invest, min_level_code || 'PRE', duration_days || 30, sort_order || 0, icon || 'TrendingUp', banner_url || null, is_active !== false]);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.put('/investment-plans/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { slug, name, description, plan_type, daily_rate, min_invest, max_invest, min_level_code, duration_days, sort_order, icon, banner_url, is_active } = req.body;
    await db.query(`UPDATE investment_plans SET slug=$1, name=$2, description=$3, plan_type=$4, daily_rate=$5, min_invest=$6, max_invest=$7, min_level_code=$8, duration_days=$9, sort_order=$10, icon=$11, banner_url=$12, is_active=$13, updated_at=NOW() WHERE id=$14`,
      [slug, name, description || '', plan_type || 'solo', daily_rate, min_invest, max_invest, min_level_code || 'PRE', duration_days || 30, sort_order || 0, icon || 'TrendingUp', banner_url || null, is_active !== false, req.params.id]);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
