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
  console.log('🔧 Running entity label migrations...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN (
        'exchange', 'mining_pool', 'defi', 'mixer',
        'darknet', 'ransomware', 'scam', 'government',
        'institution', 'wallet_provider', 'payment', 'other'
      )),
      subcategory TEXT,
      url TEXT,
      description TEXT,
      country TEXT,
      is_sanctioned BOOLEAN DEFAULT FALSE,
      is_regulated BOOLEAN DEFAULT FALSE,
      risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS entity_addresses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      label TEXT,
      address_type TEXT DEFAULT 'hot_wallet' CHECK (address_type IN (
        'hot_wallet', 'cold_wallet', 'deposit', 'withdrawal',
        'fee', 'mining', 'contract', 'other'
      )),
      is_verified BOOLEAN DEFAULT FALSE,
      source TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(address)
    );

    CREATE TABLE IF NOT EXISTS entity_tags (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
      tag TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entity_addresses_address ON entity_addresses(address);
    CREATE INDEX IF NOT EXISTS idx_entity_addresses_entity ON entity_addresses(entity_id);
    CREATE INDEX IF NOT EXISTS idx_entities_category ON entities(category);
    CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
  `);
  console.log('✅ Entity label migrations complete.');
  await pool.end();
}

migrate().catch(console.error);
