import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/deposits
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { amount, network, txHash } = req.body;
    const userId = req.userId!;

    // Get min deposit from settings
    const settings = await db.query("SELECT value FROM admin_settings WHERE key = 'min_deposit'");
    const minDeposit = parseFloat(settings.rows[0]?.value || '50');
    if (!amount || amount < minDeposit) {
      return res.status(400).json({ error: `Minimo deposito: ${minDeposit} USDT` });
    }

    const result = await db.query(
      `INSERT INTO deposits (id, user_id, amount, network, tx_hash, to_address)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, (SELECT value FROM admin_settings WHERE key = $5))
       RETURNING id`,
      [userId, amount, network, txHash || null,
       network === 'TRC-20' ? 'company_wallet_trc20' : 'company_wallet_erc20']
    );

    res.json({ success: true, depositId: result.rows[0].id });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/deposits/user/:userId
router.get('/user/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
