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
  console.log('🔧 Running case manager migrations...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cases (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open' CHECK (status IN ('open','active','closed','archived')),
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
      investigator TEXT,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS case_addresses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      label TEXT,
      role TEXT DEFAULT 'suspect' CHECK (role IN ('suspect','victim','exchange','mixer','unknown')),
      notes TEXT,
      added_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(case_id, address)
    );

    CREATE TABLE IF NOT EXISTS case_notes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      author TEXT DEFAULT 'investigator',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS case_evidence (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
      type TEXT CHECK (type IN ('transaction','address','cluster','pattern','screenshot','document')),
      reference_id TEXT,
      description TEXT,
      data JSONB,
      added_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
    CREATE INDEX IF NOT EXISTS idx_case_addresses_case ON case_addresses(case_id);
    CREATE INDEX IF NOT EXISTS idx_case_addresses_address ON case_addresses(address);
    CREATE INDEX IF NOT EXISTS idx_case_notes_case ON case_notes(case_id);
  `);
  console.log('✅ Case manager migrations complete.');
  await pool.end();
}

migrate().catch(console.error);
