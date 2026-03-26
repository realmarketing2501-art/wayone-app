import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { connectDB } from './config/database';
import { startCronJobs } from './services/cron.service';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import investRoutes from './routes/invest.routes';
import depositRoutes from './routes/deposit.routes';
import withdrawRoutes from './routes/withdraw.routes';
import networkRoutes from './routes/network.routes';
import incomeRoutes from './routes/income.routes';
import tasksRoutes from './routes/tasks.routes';
import fundRoutes from './routes/fund.routes';
import adminRoutes from './routes/admin.routes';
import publicRoutes from './routes/public.routes';

const app = express();

// ─── Security middleware ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: config.FRONTEND_URL,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// ─── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW * 60 * 1000,
  max: config.RATE_LIMIT_MAX,
  message: { error: 'Troppe richieste, riprova tra poco' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Troppi tentativi di accesso' },
});
app.use('/api/auth/', authLimiter);

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invest', investRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/withdrawals', withdrawRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Global error handler ─────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Errore interno del server' });
});

// ─── Start ────────────────────────────────────────────────────
async function start() {
  await connectDB();
  startCronJobs();

  app.listen(config.PORT, () => {
    console.log(`🚀 WAY ONE API running on port ${config.PORT}`);
    console.log(`   Env: ${config.NODE_ENV}`);
    console.log(`   Frontend: ${config.FRONTEND_URL}`);
  });
}

start().catch(console.error);
