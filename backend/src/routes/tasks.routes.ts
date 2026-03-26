import { Router } from 'express';
import { db } from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/tasks
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM tasks_missions WHERE is_active = TRUE ORDER BY task_type, reward_amount DESC'
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// GET /api/tasks/progress/:userId
router.get('/progress/:userId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await db.query(
      `SELECT tm.*, ut.is_completed, ut.is_claimed, ut.progress, ut.completed_at
       FROM tasks_missions tm
       LEFT JOIN user_tasks ut ON tm.id = ut.task_id AND ut.user_id = $1
       WHERE tm.is_active = TRUE
       ORDER BY tm.task_type, tm.reward_amount DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// POST /api/tasks/:taskId/claim
router.post('/:taskId/claim', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId!;

    // Check not already claimed
    const existing = await db.query(
      'SELECT * FROM user_tasks WHERE user_id = $1 AND task_id = $2 AND is_claimed = TRUE',
      [userId, taskId]
    );
    if (existing.rows.length > 0) return res.status(400).json({ error: 'Task già completata' });

    const task = await db.query('SELECT * FROM tasks_missions WHERE id = $1', [taskId]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task non trovata' });

    const reward = parseFloat(task.rows[0].reward_amount);

    await db.query('BEGIN');
    await db.query(
      `INSERT INTO user_tasks (id, user_id, task_id, is_completed, is_claimed, completed_at, claimed_at)
       VALUES (uuid_generate_v4(), $1, $2, TRUE, TRUE, NOW(), NOW())
       ON CONFLICT (user_id, task_id) DO UPDATE
       SET is_completed = TRUE, is_claimed = TRUE, claimed_at = NOW()`,
      [userId, taskId]
    );
    await db.query(
      'UPDATE users SET balance = balance + $1, total_earned = total_earned + $1 WHERE id = $2',
      [reward, userId]
    );
    await db.query(
      `INSERT INTO income_log (id, user_id, amount, type, source_id, description)
       VALUES (uuid_generate_v4(), $1, $2, 'task_reward', $3, $4)`,
      [userId, reward, taskId, `Task completata: ${task.rows[0].title}`]
    );
    await db.query('COMMIT');

    res.json({ success: true, reward });
  } catch (e: unknown) {
    await db.query('ROLLBACK');
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
