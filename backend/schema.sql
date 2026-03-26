-- WAY ONE - Schema PostgreSQL completo
-- Esegui con: psql -U wayone -d wayone_db -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  saved_wallets JSONB DEFAULT '[]'::jsonb,
  level VARCHAR(20) DEFAULT 'PRE',
  balance DECIMAL(18,2) DEFAULT 0.00,
  total_earned DECIMAL(18,2) DEFAULT 0.00,
  total_invested DECIMAL(18,2) DEFAULT 0.00,
  total_withdrawn DECIMAL(18,2) DEFAULT 0.00,
  referral_code VARCHAR(30) UNIQUE NOT NULL,
  referred_by UUID REFERENCES users(id),
  kyc_status VARCHAR(20) DEFAULT 'pending',
  kyc_document_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_suspended BOOLEAN DEFAULT FALSE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(255),
  language VARCHAR(5) DEFAULT 'it',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── INVESTMENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(30) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  daily_rate DECIMAL(6,4) NOT NULL,
  total_earned DECIMAL(18,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  last_payout TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── DEPOSITS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(18,2) NOT NULL,
  network VARCHAR(10) NOT NULL,
  tx_hash VARCHAR(255),
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  confirmations INT DEFAULT 0,
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── WITHDRAWALS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(18,2) NOT NULL,
  net_amount DECIMAL(18,2) NOT NULL,
  fee_percent DECIMAL(5,2) NOT NULL,
  fee_amount DECIMAL(18,2) NOT NULL,
  speed VARCHAR(10) NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  network VARCHAR(10) NOT NULL,
  tx_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  admin_note TEXT,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── NETWORK TREE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS network_tree (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  branch_position INT NOT NULL CHECK (branch_position BETWEEN 1 AND 6),
  level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 6),
  is_active BOOLEAN DEFAULT TRUE,
  investment_amount DECIMAL(18,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_id, branch_position)
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  target_audience VARCHAR(50) DEFAULT 'all',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── TASKS / MISSIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reward_amount DECIMAL(18,2) NOT NULL,
  task_type VARCHAR(20) NOT NULL DEFAULT 'daily',
  requirement_type VARCHAR(50) NOT NULL DEFAULT 'manual',
  requirement_value INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── USER TASKS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks_missions(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  is_claimed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  claimed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- ─── FUNDS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount DECIMAL(18,2) NOT NULL,
  current_amount DECIMAL(18,2) DEFAULT 0.00,
  daily_rate DECIMAL(5,4) NOT NULL,
  min_investment DECIMAL(18,2) DEFAULT 100.00,
  max_investment DECIMAL(18,2) DEFAULT 10000.00,
  duration_days INT NOT NULL DEFAULT 30,
  status VARCHAR(20) DEFAULT 'issuing',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── FUND INVESTMENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fund_investments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  amount DECIMAL(18,2) NOT NULL,
  total_earned DECIMAL(18,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── QUALIFICATION LEVELS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS qualification_levels (
  code VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  daily_rate DECIMAL(6,4) NOT NULL,
  network_bonus DECIMAL(6,4) NOT NULL DEFAULT 0,
  required_direct INT NOT NULL DEFAULT 0,
  required_total_team INT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  icon VARCHAR(40) DEFAULT 'Shield',
  color VARCHAR(40) DEFAULT 'badge-neutral',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── INVESTMENT PLANS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS investment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  plan_type VARCHAR(20) NOT NULL DEFAULT 'solo',
  daily_rate DECIMAL(6,4) NOT NULL,
  min_invest DECIMAL(18,2) NOT NULL,
  max_invest DECIMAL(18,2) NOT NULL,
  min_level_code VARCHAR(30) NOT NULL DEFAULT 'PRE' REFERENCES qualification_levels(code),
  duration_days INT NOT NULL DEFAULT 30,
  sort_order INT NOT NULL DEFAULT 0,
  icon VARCHAR(40) DEFAULT 'TrendingUp',
  banner_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── FAQ ENTRIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faq_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_it VARCHAR(255) NOT NULL,
  answer_it TEXT NOT NULL,
  question_en VARCHAR(255),
  answer_en TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── ADMIN SETTINGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── POPUP NOTIFICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS popup_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  target_audience VARCHAR(50) DEFAULT 'all',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── INCOME LOG ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS income_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(18,2) NOT NULL,
  type VARCHAR(30) NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_tx ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_network_parent ON network_tree(parent_id);
CREATE INDEX IF NOT EXISTS idx_network_user ON network_tree(user_id);
CREATE INDEX IF NOT EXISTS idx_income_user ON income_log(user_id);
CREATE INDEX IF NOT EXISTS idx_income_date ON income_log(created_at);
CREATE INDEX IF NOT EXISTS idx_income_type ON income_log(type);
CREATE INDEX IF NOT EXISTS idx_levels_sort ON qualification_levels(sort_order);
CREATE INDEX IF NOT EXISTS idx_plans_sort ON investment_plans(sort_order);


-- ─── DEFAULT QUALIFICATION LEVELS ──────────────────────────
INSERT INTO qualification_levels (code, name, description, daily_rate, network_bonus, required_direct, required_total_team, sort_order, icon, color) VALUES
  ('PRE', 'Pre-Qualifica', 'Livello iniziale per nuovi utenti', 0.0080, 0.0000, 0, 0, 1, 'Sparkles', 'badge-ghost'),
  ('BRONZ', 'Bronz', 'Primo livello network', 0.0100, 0.1000, 6, 6, 2, 'Shield', 'badge-warning'),
  ('SILVER', 'Silver', 'Livello intermedio con bonus team', 0.0200, 0.1500, 6, 36, 3, 'Medal', 'badge-neutral'),
  ('SILVER_ELITE', 'Silver Elite', 'Livello avanzato con payout premium', 0.0300, 0.2000, 6, 216, 4, 'Gem', 'badge-info'),
  ('GOLD', 'Gold', 'Livello professionale', 0.0400, 0.2000, 6, 1296, 5, 'Crown', 'badge-warning'),
  ('ZAFFIRO', 'Zaffiro', 'Top leader network', 0.0500, 0.2500, 6, 7776, 6, 'Trophy', 'badge-primary'),
  ('DIAMANTE', 'Diamante', 'Massimo livello corporate', 0.0600, 0.3000, 6, 46656, 7, 'Diamond', 'badge-secondary')
ON CONFLICT (code) DO NOTHING;

-- ─── DEFAULT INVESTMENT PLANS ──────────────────────────────
INSERT INTO investment_plans (slug, name, description, plan_type, daily_rate, min_invest, max_invest, min_level_code, duration_days, sort_order, icon)
VALUES
  ('solo-starter', 'Solo Starter', 'Piano base per iniziare in autonomia', 'solo', 0.0060, 50.00, 100.00, 'PRE', 30, 1, 'Wallet'),
  ('bronz-network', 'Network Bronz', 'Piano dedicato ai primi builder', 'network', 0.0100, 100.00, 10000.00, 'BRONZ', 30, 2, 'Users'),
  ('silver-network', 'Network Silver', 'Piano network intermedio', 'network', 0.0200, 250.00, 25000.00, 'SILVER', 30, 3, 'TrendingUp'),
  ('elite-network', 'Network Elite', 'Piano elite per team in crescita', 'network', 0.0300, 500.00, 50000.00, 'SILVER_ELITE', 45, 4, 'Rocket'),
  ('gold-network', 'Network Gold', 'Piano professionale ad alto volume', 'network', 0.0400, 1000.00, 100000.00, 'GOLD', 60, 5, 'Crown')
ON CONFLICT (slug) DO NOTHING;

-- ─── DEFAULT FAQ ────────────────────────────────────────────
INSERT INTO faq_entries (question_it, answer_it, question_en, answer_en, sort_order)
VALUES
  ('Come funziona il piano invest?', 'Scegli un piano disponibile per il tuo livello, investi il capitale e ricevi rendimenti giornalieri automatici fino alla durata prevista.', 'How does the invest plan work?', 'Choose a plan available for your level, invest your capital and receive automatic daily returns until the plan duration ends.', 1),
  ('Come funziona il referral?', 'Condividi il tuo link o QR personale. Quando un amico si registra con il tuo codice entra nel tuo albero network.', 'How does referral work?', 'Share your personal link or QR. When a friend signs up with your code they join your network tree.', 2),
  ('Quando ricevo i rendimenti?', 'I rendimenti vengono processati automaticamente dal cron giornaliero della piattaforma.', 'When do I receive returns?', 'Returns are processed automatically by the platform daily cron.', 3)
ON CONFLICT DO NOTHING;

-- ─── DEFAULT SETTINGS ─────────────────────────────────────────
INSERT INTO admin_settings (key, value, description) VALUES
  ('min_deposit', '50', 'Deposito minimo USDT'),
  ('min_withdrawal', '10', 'Prelievo minimo USDT'),
  ('withdrawal_fee_fast', '20', 'Fee prelievo veloce %'),
  ('withdrawal_fee_medium', '10', 'Fee prelievo medio %'),
  ('withdrawal_fee_slow', '5', 'Fee prelievo lento %'),
  ('company_wallet_trc20', '', 'Wallet aziendale TRC-20'),
  ('company_wallet_erc20', '', 'Wallet aziendale ERC-20'),
  ('maintenance_mode', 'false', 'Modalità manutenzione'),
  ('pre_qualification_rate', '0.80', 'Rendimento % giornaliero pre-qualifica'),
  ('hero_title', 'WAY ONE', 'Titolo hero frontend'),
  ('hero_subtitle', 'Invest. Grow. Succeed.', 'Sottotitolo hero frontend')
ON CONFLICT (key) DO NOTHING;

-- ─── DEFAULT TASKS ────────────────────────────────────────────
INSERT INTO tasks_missions (id, title, description, reward_amount, task_type, requirement_type) VALUES
  (uuid_generate_v4(), 'Accesso Giornaliero', 'Effettua il login ogni giorno', 0.50, 'daily', 'login'),
  (uuid_generate_v4(), 'Primo Deposito', 'Esegui il tuo primo deposito', 5.00, 'one_time', 'deposit'),
  (uuid_generate_v4(), 'Invita un Amico', 'Invita 1 amico con il tuo codice referral', 2.00, 'weekly', 'referral'),
  (uuid_generate_v4(), 'Primo Investimento', 'Crea il tuo primo piano di investimento', 3.00, 'one_time', 'invest'),
  (uuid_generate_v4(), 'Completa Profilo', 'Completa tutte le informazioni del profilo', 1.00, 'one_time', 'profile')
ON CONFLICT DO NOTHING;

-- ─── DEFAULT FUND ─────────────────────────────────────────────
INSERT INTO funds (id, name, description, target_amount, daily_rate, min_investment, max_investment, duration_days, status)
VALUES
  (uuid_generate_v4(), 'Alpha Fund', 'Fondo ad alto rendimento con gestione professionale', 50000.00, 0.0120, 100.00, 5000.00, 30, 'issuing'),
  (uuid_generate_v4(), 'Beta Fund', 'Fondo stabile a medio termine', 100000.00, 0.0090, 200.00, 10000.00, 60, 'issuing')
ON CONFLICT DO NOTHING;
