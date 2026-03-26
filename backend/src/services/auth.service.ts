import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import { config } from '../config/env';

function generateTokens(userId: string) {
  return {
    accessToken: jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRY }),
    refreshToken: jwt.sign({ userId }, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRY }),
  };
}

export async function register(input: { email: string; password: string; fullName: string; referralCode?: string }) {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [input.email]);
  if (existing.rows.length > 0) throw new Error('Email già registrata');

  const passwordHash = await bcrypt.hash(input.password, config.BCRYPT_ROUNDS);
  const referralCode = 'WO-' + uuidv4().slice(0, 8).toUpperCase();

  let referredBy: string | null = null;
  if (input.referralCode) {
    const ref = await db.query('SELECT id FROM users WHERE referral_code = $1', [input.referralCode]);
    if (ref.rows.length > 0) referredBy = ref.rows[0].id;
  }

  const result = await db.query(
    `INSERT INTO users (id, email, password_hash, full_name, referral_code, referred_by)
     VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)
     RETURNING id, email, full_name, referral_code, level, balance`,
    [input.email, passwordHash, input.fullName, referralCode, referredBy]
  );

  const user = result.rows[0];

  // Add to network tree
  if (referredBy) {
    const branches = await db.query(
      'SELECT branch_position FROM network_tree WHERE parent_id = $1 ORDER BY branch_position',
      [referredBy]
    );
    const usedPositions = branches.rows.map((b: { branch_position: number }) => b.branch_position);
    let nextPos = 1;
    for (let i = 1; i <= 6; i++) {
      if (!usedPositions.includes(i)) { nextPos = i; break; }
    }
    await db.query(
      'INSERT INTO network_tree (id, user_id, parent_id, branch_position, level) VALUES (uuid_generate_v4(), $1, $2, $3, 1)',
      [user.id, referredBy, nextPos]
    );
  }

  return { user, ...generateTokens(user.id) };
}

export async function login(email: string, password: string) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) throw new Error('Email o password errati');

  const user = result.rows[0];
  if (user.is_suspended) throw new Error('Account sospeso');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Email o password errati');

  await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  const { password_hash, two_factor_secret, ...safeUser } = user;
  return { user: safeUser, ...generateTokens(user.id) };
}

export async function refresh(token: string) {
  const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as { userId: string };
  return generateTokens(payload.userId);
}
