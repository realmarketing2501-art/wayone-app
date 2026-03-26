import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/funds
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM funds ORDER BY status, created_at DESC');
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/funds/:fundId/invest
router.post('/:fundId/invest', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { fundId } = req.params;
    const { amount } = req.body;
    const userId = req.userId!;

    const fund = await db.query('SELECT * FROM funds WHERE id = $1', [fundId]);
    if (fund.rows.length === 0) return res.status(404).json({ error: 'Fondo non trovato' });
    const f = fund.rows[0];

    if (f.status !== 'issuing') return res.status(400).json({ error: 'Fondo non disponibile' });
    if (amount < parseFloat(f.min_investment)) return res.status(400).json({ error: `Minimo: ${f.min_investment} USDT` });
    if (amount > parseFloat(f.max_investment)) return res.status(400).json({ error: `Massimo: ${f.max_investment} USDT` });

    const remaining = parseFloat(f.target_amount) - parseFloat(f.current_amount);
    if (amount > remaining) return res.status(400).json({ error: `Disponibile: ${remaining.toFixed(2)} USDT` });

    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (parseFloat(userRes.rows[0].balance) < amount) {
      return res.status(400).json({ error: 'Saldo insufficiente' });
    }

    await db.query('BEGIN');
    await db.query(
      `INSERT INTO fund_investments (id, user_id, fund_id, amount)
       VALUES (uuid_generate_v4(), $1, $2, $3)`,
      [userId, fundId, amount]
    );
    await db.query('UPDATE funds SET current_amount = current_amount + $1 WHERE id = $2', [amount, fundId]);
    await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);

    // Check if full
    const updated = await db.query('SELECT current_amount, target_amount FROM funds WHERE id = $1', [fundId]);
    if (parseFloat(updated.rows[0].current_amount) >= parseFloat(updated.rows[0].target_amount)) {
      await db.query("UPDATE funds SET status = 'sold_out' WHERE id = $1", [fundId]);
    }
    await db.query('COMMIT');

    res.json({ success: true });
  } catch (e: unknown) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
