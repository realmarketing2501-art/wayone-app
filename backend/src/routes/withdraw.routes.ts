import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

const SPEED_FEES: Record<string, number> = {
  fast: 20,
  medium: 10,
  slow: 5,
};

// POST /api/withdrawals
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { amount, network, walletAddress, speed } = req.body;
    const userId = req.userId!;

    if (!walletAddress) return res.status(400).json({ error: 'Indirizzo wallet richiesto' });

    const feePercent = SPEED_FEES[speed];
    if (feePercent === undefined) return res.status(400).json({ error: 'Velocità non valida' });

    const settings = await db.query("SELECT key, value FROM admin_settings WHERE key IN ('min_withdrawal', 'max_withdrawal')");
    const s: Record<string, string> = {};
    settings.rows.forEach((r: { key: string; value: string }) => { s[r.key] = r.value; });
    const minWithdrawal = parseFloat(s['min_withdrawal'] || '10');
    if (amount < minWithdrawal) return res.status(400).json({ error: `Minimo prelievo: ${minWithdrawal} USDT` });

    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (parseFloat(userRes.rows[0].balance) < amount) {
      return res.status(400).json({ error: 'Saldo insufficiente' });
    }

    const feeAmount = (amount * feePercent) / 100;
    const netAmount = amount - feeAmount;

    await db.query('BEGIN');
    await db.query(
      `INSERT INTO withdrawals (id, user_id, amount, net_amount, fee_percent, fee_amount, speed, wallet_address, network)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, amount, netAmount, feePercent, feeAmount, speed, walletAddress, network]
    );
    await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);
    await db.query('COMMIT');

    res.json({ success: true });
  } catch (e: unknown) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/withdrawals/user/:userId
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
