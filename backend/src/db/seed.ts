import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('admin123', 12);
  const result = await db.query(
    `INSERT INTO users (id, email, password_hash, full_name, referral_code, level, is_admin, balance)
     VALUES (uuid_generate_v4(), 'admin@wayone.io', $1, 'Admin WAY ONE', 'WO-ADMIN001', 'DIAMANTE', TRUE, 10000)
     ON CONFLICT (email) DO NOTHING
     RETURNING email`,
    [passwordHash]
  );

  if (result.rows.length > 0) {
    console.log('✅ Admin creato: admin@wayone.io / admin123');
  } else {
    console.log('ℹ️  Admin già esistente');
  }

  // Create a test user
  const testHash = await bcrypt.hash('test123', 12);
  await db.query(
    `INSERT INTO users (id, email, password_hash, full_name, referral_code, balance)
     VALUES (uuid_generate_v4(), 'demo@wayone.io', $1, 'Demo User', 'WO-DEMO001', 500)
     ON CONFLICT (email) DO NOTHING`,
    [testHash]
  );
  console.log('✅ Demo user creato: demo@wayone.io / test123');

  await db.end();
  console.log('🎉 Seed completato!');
}

seed().catch(e => {
  console.error('❌ Seed error:', e);
  process.exit(1);
});
