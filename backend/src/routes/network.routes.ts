import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/network/tree/:userId
router.get('/tree/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;
    // Recursive CTE to fetch tree up to 6 levels deep
    const result = await db.query(
      `WITH RECURSIVE tree AS (
         SELECT nt.id, nt.user_id, nt.parent_id, nt.branch_position, nt.level AS tree_level,
                nt.is_active, nt.investment_amount, nt.created_at,
                u.full_name AS name, u.email, u.level AS user_level, u.total_invested, u.is_suspended
         FROM network_tree nt
         LEFT JOIN users u ON nt.user_id = u.id
         WHERE nt.parent_id = $1
         UNION ALL
         SELECT nt.id, nt.user_id, nt.parent_id, nt.branch_position, nt.level AS tree_level,
                nt.is_active, nt.investment_amount, nt.created_at,
                u.full_name AS name, u.email, u.level AS user_level, u.total_invested, u.is_suspended
         FROM network_tree nt
         LEFT JOIN users u ON nt.user_id = u.id
         INNER JOIN tree t ON nt.parent_id = t.user_id
         WHERE nt.level <= 6
       )
       SELECT * FROM tree ORDER BY tree_level, branch_position`,
      [userId]
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/network/stats/:userId
router.get('/stats/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params;

    const directRes = await db.query(
      'SELECT COUNT(*) AS cnt FROM network_tree WHERE parent_id = $1',
      [userId]
    );
    const totalRes = await db.query(
      `WITH RECURSIVE tree AS (
         SELECT user_id FROM network_tree WHERE parent_id = $1
         UNION ALL
         SELECT nt.user_id FROM network_tree nt INNER JOIN tree t ON nt.parent_id = t.user_id
       )
       SELECT COUNT(*) AS cnt FROM tree`,
      [userId]
    );
    const volumeRes = await db.query(
      `WITH RECURSIVE tree AS (
         SELECT user_id FROM network_tree WHERE parent_id = $1
         UNION ALL
         SELECT nt.user_id FROM network_tree nt INNER JOIN tree t ON nt.parent_id = t.user_id
       )
       SELECT COALESCE(SUM(u.total_invested), 0) AS volume FROM users u
       WHERE u.id IN (SELECT user_id FROM tree)`,
      [userId]
    );
    const levelDistRes = await db.query(
      `WITH RECURSIVE tree AS (
         SELECT user_id FROM network_tree WHERE parent_id = $1
         UNION ALL
         SELECT nt.user_id FROM network_tree nt INNER JOIN tree t ON nt.parent_id = t.user_id
       )
       SELECT u.level, COUNT(*) AS cnt FROM users u
       WHERE u.id IN (SELECT user_id FROM tree)
       GROUP BY u.level`,
      [userId]
    );

    const levelDistribution: Record<string, number> = {};
    levelDistRes.rows.forEach((r: { level: string; cnt: string }) => {
      levelDistribution[r.level] = parseInt(r.cnt);
    });

    res.json({
      directReferrals: parseInt(directRes.rows[0].cnt),
      totalMembers: parseInt(totalRes.rows[0].cnt),
      totalVolume: parseFloat(volumeRes.rows[0].volume),
      levelDistribution,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
