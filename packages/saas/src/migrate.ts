import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'chaintail',
  password: process.env.DB_PASSWORD || 'chaintail',
  database: process.env.DB_NAME || 'chaintail',
});

async function migrate() {
  console.log('🔧 Running SaaS migrations...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
      is_active BOOLEAN DEFAULT TRUE,
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key_hash TEXT UNIQUE NOT NULL,
      key_prefix TEXT NOT NULL,
      name TEXT DEFAULT 'Default',
      is_active BOOLEAN DEFAULT TRUE,
      last_used_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER,
      response_time_ms INTEGER,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS usage_quotas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT DEFAULT 'free',
      traces_used INTEGER DEFAULT 0,
      traces_limit INTEGER DEFAULT 100,
      api_calls_used INTEGER DEFAULT 0,
      api_calls_limit INTEGER DEFAULT 1000,
      watched_addresses_used INTEGER DEFAULT 0,
      watched_addresses_limit INTEGER DEFAULT 1,
      pdf_exports_used INTEGER DEFAULT 0,
      pdf_exports_limit INTEGER DEFAULT 0,
      reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS plans (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      price_usd INTEGER DEFAULT 0,
      traces_per_month INTEGER DEFAULT 100,
      api_calls_per_month INTEGER DEFAULT 1000,
      watched_addresses INTEGER DEFAULT 1,
      pdf_exports INTEGER DEFAULT 0,
      max_hops INTEGER DEFAULT 3,
      features TEXT[] DEFAULT '{}',
      is_active BOOLEAN DEFAULT TRUE
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
    CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON usage_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_usage_quotas_user ON usage_quotas(user_id);

    -- Seed plans
    INSERT INTO plans (name, display_name, price_usd, traces_per_month, api_calls_per_month,
                       watched_addresses, pdf_exports, max_hops, features)
    VALUES
      ('free', 'Free', 0, 100, 1000, 1, 0, 3,
       ARRAY['graph_tracer','mempool_monitor','threat_intel']),
      ('pro', 'Pro', 2900, 10000, 50000, 50, 100, 5,
       ARRAY['graph_tracer','mempool_monitor','threat_intel','pdf_export',
             'api_access','webhooks','pattern_detection','entity_labels']),
      ('enterprise', 'Enterprise', 9900, -1, -1, -1, -1, 10,
       ARRAY['graph_tracer','mempool_monitor','threat_intel','pdf_export',
             'api_access','webhooks','pattern_detection','entity_labels',
             'case_management','ml_scoring','eth_support','priority_support'])
    ON CONFLICT (name) DO UPDATE SET
      price_usd = EXCLUDED.price_usd,
      features = EXCLUDED.features;
  `);
  console.log('✅ SaaS migrations complete.');
  await pool.end();
}

migrate().catch(console.error);
