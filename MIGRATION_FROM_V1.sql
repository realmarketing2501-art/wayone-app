-- WAY ONE upgrade migration from deployed v1 to repo-ready upgraded package
-- Safe to run multiple times where possible.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users additions
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_wallets JSONB DEFAULT '[]'::jsonb;

-- New business configuration tables
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

CREATE INDEX IF NOT EXISTS idx_levels_sort ON qualification_levels(sort_order);
CREATE INDEX IF NOT EXISTS idx_plans_sort ON investment_plans(sort_order);

-- Seed levels if missing
INSERT INTO qualification_levels (code, name, description, daily_rate, network_bonus, required_direct, required_total_team, sort_order, icon, color)
SELECT * FROM (
  VALUES
    ('PRE', 'Pre', 'Livello iniziale', 0.8000, 0.0000, 0, 0, 0, 'Shield', 'badge-level-pre'),
    ('BRONZ', 'Bronz', 'Prima qualifica network', 0.9000, 0.1000, 2, 10, 1, 'Medal', 'badge-level-bronz'),
    ('SILVER', 'Silver', 'Qualifica silver', 1.0000, 0.1500, 4, 25, 2, 'Award', 'badge-level-silver'),
    ('SILVER_ELITE', 'Silver Elite', 'Qualifica silver elite', 1.1500, 0.2000, 6, 50, 3, 'Gem', 'badge-level-silver-elite'),
    ('GOLD', 'Gold', 'Qualifica gold', 1.3000, 0.2500, 8, 100, 4, 'Crown', 'badge-level-gold'),
    ('ZAFFIRO', 'Zaffiro', 'Qualifica zaffiro', 1.5000, 0.3000, 10, 200, 5, 'Sparkles', 'badge-level-zaffiro'),
    ('DIAMANTE', 'Diamante', 'Qualifica diamante', 1.8000, 0.4000, 12, 400, 6, 'Diamond', 'badge-level-diamante')
) AS seed(code, name, description, daily_rate, network_bonus, required_direct, required_total_team, sort_order, icon, color)
WHERE NOT EXISTS (SELECT 1 FROM qualification_levels q WHERE q.code = seed.code);

-- Seed plans if missing
INSERT INTO investment_plans (slug, name, description, plan_type, daily_rate, min_invest, max_invest, min_level_code, duration_days, sort_order, icon)
SELECT * FROM (
  VALUES
    ('solo', 'Solo', 'Piano base accessibile a tutti', 'solo', 0.8000, 50.00, 25000.00, 'PRE', 30, 0, 'Wallet'),
    ('network_bronz', 'Network Bronz', 'Piano network per utenti Bronz', 'network', 0.9000, 100.00, 50000.00, 'BRONZ', 30, 1, 'TrendingUp'),
    ('network_silver', 'Network Silver', 'Piano network per utenti Silver', 'network', 1.0000, 100.00, 100000.00, 'SILVER', 30, 2, 'TrendingUp'),
    ('network_silver_elite', 'Network Silver Elite', 'Piano network per utenti Silver Elite', 'network', 1.1500, 100.00, 150000.00, 'SILVER_ELITE', 30, 3, 'TrendingUp'),
    ('network_gold', 'Network Gold', 'Piano network per utenti Gold', 'network', 1.3000, 100.00, 200000.00, 'GOLD', 30, 4, 'TrendingUp'),
    ('network_zaffiro', 'Network Zaffiro', 'Piano network per utenti Zaffiro', 'network', 1.5000, 100.00, 300000.00, 'ZAFFIRO', 30, 5, 'TrendingUp'),
    ('network_diamante', 'Network Diamante', 'Piano network per utenti Diamante', 'network', 1.8000, 100.00, 500000.00, 'DIAMANTE', 30, 6, 'TrendingUp')
) AS seed(slug, name, description, plan_type, daily_rate, min_invest, max_invest, min_level_code, duration_days, sort_order, icon)
WHERE NOT EXISTS (SELECT 1 FROM investment_plans p WHERE p.slug = seed.slug);

-- Seed FAQ if empty
INSERT INTO faq_entries (question_it, answer_it, question_en, answer_en, sort_order)
SELECT * FROM (
  VALUES
    ('Come funziona il deposito?', 'Invii la richiesta di deposito, l''admin la verifica oppure viene confermata dal controllo automatico supportato dalla rete.', 'How does deposit work?', 'You submit a deposit request, then it is verified by admin or by supported automatic network checks.', 1),
    ('Come funziona l''investimento?', 'L''utente investe dal saldo disponibile scegliendo un piano attivo compatibile con il proprio livello.', 'How does investing work?', 'The user invests from available balance by choosing an active plan compatible with their level.', 2),
    ('I prelievi sono automatici?', 'No. I prelievi restano in pending finché non vengono approvati o rifiutati dall''admin.', 'Are withdrawals automatic?', 'No. Withdrawals stay pending until an admin approves or rejects them.', 3)
) AS seed(question_it, answer_it, question_en, answer_en, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM faq_entries);
