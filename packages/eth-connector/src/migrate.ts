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
  console.log('🔧 Running ETH migrations...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS eth_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      txhash TEXT UNIQUE NOT NULL,
      block_number BIGINT,
      timestamp TIMESTAMPTZ,
      from_address TEXT,
      to_address TEXT,
      value_wei TEXT,
      gas_used BIGINT,
      gas_price TEXT,
      is_error BOOLEAN DEFAULT FALSE,
      chain TEXT DEFAULT 'mainnet',
      first_seen TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS eth_token_transfers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      txhash TEXT NOT NULL,
      from_address TEXT,
      to_address TEXT,
      token_address TEXT,
      token_name TEXT,
      token_symbol TEXT,
      value TEXT,
      block_number BIGINT,
      timestamp TIMESTAMPTZ,
      chain TEXT DEFAULT 'mainnet'
    );

    CREATE TABLE IF NOT EXISTS eth_addresses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      address TEXT UNIQUE NOT NULL,
      balance_wei TEXT DEFAULT '0',
      tx_count INTEGER DEFAULT 0,
      is_contract BOOLEAN DEFAULT FALSE,
      risk_score INTEGER DEFAULT 0,
      labels TEXT[] DEFAULT '{}',
      first_seen TIMESTAMPTZ DEFAULT NOW(),
      last_seen TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_eth_tx_from ON eth_transactions(from_address);
    CREATE INDEX IF NOT EXISTS idx_eth_tx_to ON eth_transactions(to_address);
    CREATE INDEX IF NOT EXISTS idx_eth_tx_hash ON eth_transactions(txhash);
    CREATE INDEX IF NOT EXISTS idx_eth_token_from ON eth_token_transfers(from_address);
    CREATE INDEX IF NOT EXISTS idx_eth_token_to ON eth_token_transfers(to_address);
  `);
  console.log('✅ ETH migrations complete.');
  await pool.end();
}

migrate().catch(console.error);
