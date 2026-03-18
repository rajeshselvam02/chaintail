CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT,
  risk_level TEXT DEFAULT 'unknown' CHECK (risk_level IN ('low','medium','high','critical','unknown')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT UNIQUE NOT NULL,
  cluster_id UUID REFERENCES clusters(id),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  labels TEXT[] DEFAULT '{}',
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  tx_count INTEGER DEFAULT 0,
  total_received BIGINT DEFAULT 0,
  total_sent BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  txid TEXT UNIQUE NOT NULL,
  block_height INTEGER,
  block_hash TEXT,
  timestamp TIMESTAMPTZ,
  fee BIGINT DEFAULT 0,
  size INTEGER DEFAULT 0,
  is_confirmed BOOLEAN DEFAULT FALSE,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  raw_data JSONB
);

CREATE TABLE IF NOT EXISTS tx_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  txid TEXT NOT NULL REFERENCES transactions(txid) ON DELETE CASCADE,
  from_address TEXT,
  prev_txid TEXT,
  prev_vout INTEGER,
  value_satoshi BIGINT DEFAULT 0,
  vin_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tx_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  txid TEXT NOT NULL REFERENCES transactions(txid) ON DELETE CASCADE,
  to_address TEXT,
  value_satoshi BIGINT DEFAULT 0,
  vout_index INTEGER NOT NULL,
  script_type TEXT,
  spent BOOLEAN DEFAULT FALSE,
  spent_by_txid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS threat_intel (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT NOT NULL,
  label TEXT NOT NULL,
  category TEXT CHECK (category IN ('mixer','darknet','exchange','scam','ransomware','sanctioned','other')),
  source TEXT,
  confidence INTEGER DEFAULT 100 CHECK (confidence BETWEEN 0 AND 100),
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  address TEXT,
  txid TEXT,
  reason TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  metadata JSONB,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS mempool_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  txid TEXT NOT NULL,
  fee BIGINT,
  size INTEGER,
  fee_rate NUMERIC,
  ancestor_count INTEGER,
  descendant_count INTEGER,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  dropped_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_addresses_address ON addresses(address);
CREATE INDEX IF NOT EXISTS idx_transactions_txid ON transactions(txid);
CREATE INDEX IF NOT EXISTS idx_transactions_confirmed ON transactions(is_confirmed);
CREATE INDEX IF NOT EXISTS idx_tx_inputs_from ON tx_inputs(from_address);
CREATE INDEX IF NOT EXISTS idx_tx_outputs_to ON tx_outputs(to_address);
CREATE INDEX IF NOT EXISTS idx_threat_intel_address ON threat_intel(address);
CREATE INDEX IF NOT EXISTS idx_mempool_txid ON mempool_snapshots(txid);
