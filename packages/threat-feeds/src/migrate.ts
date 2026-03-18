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
  console.log('🔧 Running Phase 6 migrations...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS watched_addresses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      address TEXT UNIQUE NOT NULL,
      label TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_hit TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      events TEXT[] DEFAULT '{}',
      secret TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS webhook_deliveries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
      event TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      delivered_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS feed_sync_log (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      source TEXT NOT NULL,
      imported INTEGER DEFAULT 0,
      skipped INTEGER DEFAULT 0,
      errors INTEGER DEFAULT 0,
      synced_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_watched_addresses ON watched_addresses(address);
    CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
  `);
  console.log('✅ Phase 6 migrations complete.');
  await pool.end();
}

migrate().catch(console.error);
