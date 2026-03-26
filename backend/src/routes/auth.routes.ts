import { Router } from 'express';
import { register, login, refresh } from '../services/auth.service';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const data = await register(req.body);
    res.json(data);
  } catch (e: unknown) {
    res.status(400).json({ error: (e as Error).message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = await login(req.body.email, req.body.password);
    res.json(data);
  } catch (e: unknown) {
    res.status(401).json({ error: (e as Error).message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const tokens = await refresh(req.body.refreshToken);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Refresh token non valido' });
  }
});

export default router;
