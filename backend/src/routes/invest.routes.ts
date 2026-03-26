import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

async function getLevelOrderMap(): Promise<Record<string, number>> {
  const result = await db.query(`SELECT code, sort_order FROM qualification_levels WHERE is_active = TRUE ORDER BY sort_order ASC`);
  const map: Record<string, number> = {};
  result.rows.forEach((r: { code: string; sort_order: number }) => {
    map[r.code] = Number(r.sort_order || 0);
  });
  return map;
}

router.get('/plans', authMiddleware, async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT id, slug, name, description, plan_type, daily_rate, min_invest, max_invest, min_level_code, duration_days, icon, banner_url
       FROM investment_plans WHERE is_active = TRUE ORDER BY sort_order ASC, created_at ASC`
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { planId, amount } = req.body;
    const userId = req.userId!;

    if (!planId) return res.status(400).json({ error: 'Piano obbligatorio' });
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Importo non valido' });

    const [planRes, userRes, levelMap] = await Promise.all([
      db.query(`SELECT * FROM investment_plans WHERE id = $1 AND is_active = TRUE`, [planId]),
      db.query(`SELECT id, balance, level, is_suspended FROM users WHERE id = $1`, [userId]),
      getLevelOrderMap(),
    ]);

    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Piano non trovato' });
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'Utente non trovato' });

    const plan = planRes.rows[0];
    const user = userRes.rows[0];
    const numAmount = Number(amount);

    if (user.is_suspended) return res.status(403).json({ error: 'Account sospeso' });
    if (numAmount < Number(plan.min_invest)) return res.status(400).json({ error: `Importo minimo ${plan.min_invest} USDT` });
    if (numAmount > Number(plan.max_invest)) return res.status(400).json({ error: `Importo massimo ${plan.max_invest} USDT` });
    if (Number(user.balance) < numAmount) return res.status(400).json({ error: 'Saldo insufficiente' });

    const userOrder = levelMap[user.level] ?? 0;
    const planOrder = levelMap[plan.min_level_code] ?? 0;
    if (userOrder < planOrder) {
      return res.status(403).json({ error: `Livello richiesto: ${plan.min_level_code}` });
    }

    await db.query('BEGIN');
    const inv = await db.query(
      `INSERT INTO investments (id, user_id, plan, amount, daily_rate, end_date)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW() + ($5 || ' days')::interval)
       RETURNING id`,
      [userId, plan.slug, numAmount, plan.daily_rate, plan.duration_days]
    );

    await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [numAmount, userId]);
    await db.query(
      `INSERT INTO income_log (id, user_id, amount, type, source_id, description)
       VALUES (uuid_generate_v4(), $1, $2, 'investment', $3, $4)`,
      [userId, -numAmount, inv.rows[0].id, `Investimento ${plan.name}: ${numAmount} USDT`]
    );
    await db.query('COMMIT');
    res.json({ success: true, investmentId: inv.rows[0].id, plan: plan.name });
  } catch (e: unknown) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      `SELECT i.*, p.name AS plan_name, p.plan_type, p.icon
       FROM investments i
       LEFT JOIN investment_plans p ON p.slug = i.plan
       WHERE i.user_id = $1 ORDER BY i.created_at DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
