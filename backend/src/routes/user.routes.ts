import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { config } from '../config/env';

const router = Router();

router.get('/popups', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const level = (req.query.level as string) || '';
    const result = await db.query(
      `SELECT * FROM popup_notifications
       WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())
       AND (target_audience = 'all' OR target_audience = $1)
       ORDER BY created_at DESC`,
      [level]
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/notifications', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt((req.query.limit as string) || '20');
    const result = await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/:id/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.id;
    const [invRes, depRes, witRes, incomeRes] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume, COALESCE(SUM(total_earned),0) AS earned FROM investments WHERE user_id = $1 AND status = 'active'`, [userId]),
      db.query(`SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS volume FROM deposits WHERE user_id = $1 AND status = 'confirmed'`, [userId]),
      db.query(`SELECT COUNT(*) AS total, COALESCE(SUM(net_amount),0) AS volume FROM withdrawals WHERE user_id = $1 AND status = 'completed'`, [userId]),
      db.query(`SELECT COALESCE(SUM(amount),0) AS total FROM income_log WHERE user_id = $1 AND amount > 0`, [userId]),
    ]);
    res.json({
      activeInvestments: parseInt(invRes.rows[0].total),
      activeInvestmentVolume: parseFloat(invRes.rows[0].volume),
      activeInvestmentEarned: parseFloat(invRes.rows[0].earned),
      confirmedDeposits: parseInt(depRes.rows[0].total),
      confirmedDepositVolume: parseFloat(depRes.rows[0].volume),
      completedWithdrawals: parseInt(witRes.rows[0].total),
      completedWithdrawalVolume: parseFloat(witRes.rows[0].volume),
      positiveIncome: parseFloat(incomeRes.rows[0].total),
    });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, full_name, phone, avatar_url, saved_wallets, level, balance, total_earned,
              total_invested, total_withdrawn, referral_code, referred_by, kyc_status,
              is_admin, is_suspended, two_factor_enabled, language, last_login, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Utente non trovato' });
    res.json(result.rows[0]);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.userId !== req.params.id) return res.status(403).json({ error: 'Non autorizzato' });
    const allowed = ['full_name', 'phone', 'avatar_url', 'language', 'saved_wallets', 'kyc_status'];
    const entries = Object.entries(req.body).filter(([k]) => allowed.includes(k));
    if (req.body.password) {
      const hash = await bcrypt.hash(String(req.body.password), config.BCRYPT_ROUNDS);
      entries.push(['password_hash', hash]);
    }
    if (!entries.length) return res.status(400).json({ error: 'Nessun campo valido' });
    const fields = entries.map(([k], i) => `${k} = $${i + 2}`).join(', ');
    const values = entries.map(([, v]) => v);
    await db.query(`UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1`, [req.params.id, ...values]);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
