import dotenv from 'dotenv';
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  API_URL: process.env.API_URL || 'http://localhost:3001',

  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://wayone:password@localhost:5432/wayone_db',

  JWT_SECRET: process.env.JWT_SECRET || 'change-me-min-64-chars-random-secret-key-here-!!!',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret-key-here-!!!',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),

  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '15'),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),

  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@wayone.io',

  TRON_API_URL: process.env.TRON_API_URL || 'https://api.trongrid.io',
  TRON_API_KEY: process.env.TRON_API_KEY || '',
  TRON_COMPANY_WALLET: process.env.TRON_COMPANY_WALLET || '',

  INFURA_API_KEY: process.env.INFURA_API_KEY || '',
  ETH_COMPANY_WALLET: process.env.ETH_COMPANY_WALLET || '',
};
