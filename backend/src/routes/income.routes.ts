import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/income/history/:userId
router.get('/history/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '50');
    const result = await db.query(
      'SELECT * FROM income_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.params.userId, limit]
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/income/stats/:userId
router.get('/stats/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const typeRes = await db.query(
      `SELECT type, COALESCE(SUM(amount), 0) AS total
       FROM income_log WHERE user_id = $1 AND amount > 0
       GROUP BY type`,
      [userId]
    );
    const dailyRes = await db.query(
      `SELECT DATE(created_at) AS dt, COALESCE(SUM(amount), 0) AS total
       FROM income_log WHERE user_id = $1 AND amount > 0
       GROUP BY DATE(created_at) ORDER BY dt DESC LIMIT 30`,
      [userId]
    );

    const stats = { total: 0, interest: 0, team: 0, bonus: 0, daily: [] as { date: string; amount: number }[] };
    typeRes.rows.forEach((r: { type: string; total: string }) => {
      const amt = parseFloat(r.total);
      stats.total += amt;
      if (r.type === 'daily_return') stats.interest = amt;
      if (r.type === 'network_bonus') stats.team = amt;
      if (r.type === 'task_reward' || r.type === 'bonus') stats.bonus += amt;
    });
    stats.daily = dailyRes.rows.map((r: { dt: string; total: string }) => ({
      date: r.dt,
      amount: parseFloat(r.total),
    }));

    res.json(stats);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
