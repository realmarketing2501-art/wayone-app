import { Pool } from 'pg';
import { config } from './env';

export const db = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function connectDB() {
  const client = await db.connect();
  console.log('✅ PostgreSQL connected');
  client.release();
}
