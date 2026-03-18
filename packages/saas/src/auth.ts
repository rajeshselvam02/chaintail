import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'chaintail-secret-change-in-production';
const SALT_ROUNDS = 12;

export interface User {
  id: string;
  email: string;
  name?: string;
  plan: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AuthResult {
  user: User;
  token: string;
}

export class AuthService {
  constructor(private db: Pool) {}

  async register(email: string, password: string, name?: string): Promise<AuthResult> {
    // Check existing
    const { rows: existing } = await this.db.query(
      `SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]
    );
    if (existing.length > 0) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await this.db.query(`
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3) RETURNING *
    `, [email.toLowerCase(), passwordHash, name]);

    const user = rows[0];

    // Create default quota
    await this.db.query(`
      INSERT INTO usage_quotas (user_id, plan, traces_limit, api_calls_limit,
        watched_addresses_limit, pdf_exports_limit)
      VALUES ($1, 'free', 100, 1000, 1, 0)
    `, [user.id]);

    // Generate default API key
    await this.generateApiKey(user.id, 'Default');

    const token = this.generateToken(user);
    return { user: this.mapUser(user), token };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const { rows } = await this.db.query(
      `SELECT * FROM users WHERE email = $1 AND is_active = true`,
      [email.toLowerCase()]
    );
    if (rows.length === 0) throw new Error('Invalid credentials');

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    const token = this.generateToken(user);
    return { user: this.mapUser(user), token };
  }

  async verifyToken(token: string): Promise<User> {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const { rows } = await this.db.query(
      `SELECT * FROM users WHERE id = $1 AND is_active = true`, [payload.userId]
    );
    if (rows.length === 0) throw new Error('User not found');
    return this.mapUser(rows[0]);
  }

  async generateApiKey(userId: string, name = 'Default'): Promise<{ key: string; prefix: string }> {
    const rawKey = `ct_${crypto.randomBytes(32).toString('hex')}`;
    const prefix = rawKey.slice(0, 10);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await this.db.query(`
      INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
      VALUES ($1, $2, $3, $4)
    `, [userId, keyHash, prefix, name]);

    return { key: rawKey, prefix };
  }

  async verifyApiKey(rawKey: string): Promise<User | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const { rows } = await this.db.query(`
      SELECT u.*, ak.id AS api_key_id FROM api_keys ak
      JOIN users u ON u.id = ak.user_id
      WHERE ak.key_hash = $1 AND ak.is_active = true
        AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
        AND u.is_active = true
    `, [keyHash]);

    if (rows.length === 0) return null;

    // Update last used
    await this.db.query(
      `UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1`, [keyHash]
    );

    return this.mapUser(rows[0]);
  }

  async getQuota(userId: string): Promise<any> {
    const { rows } = await this.db.query(
      `SELECT * FROM usage_quotas WHERE user_id = $1`, [userId]
    );
    return rows[0] || null;
  }

  async incrementUsage(userId: string, type: 'traces' | 'api_calls' | 'pdf_exports'): Promise<boolean> {
    const quota = await this.getQuota(userId);
    if (!quota) return false;

    const usedField = `${type}_used`;
    const limitField = `${type}_limit`;

    // Check limit (-1 = unlimited)
    if (quota[limitField] !== -1 && quota[usedField] >= quota[limitField]) {
      return false; // quota exceeded
    }

    await this.db.query(`
      UPDATE usage_quotas SET ${usedField} = ${usedField} + 1, updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);

    return true;
  }

  async upgradePlan(userId: string, plan: 'pro' | 'enterprise'): Promise<void> {
    const limits: Record<string, any> = {
      pro: { traces_limit: 10000, api_calls_limit: 50000, watched_addresses_limit: 50, pdf_exports_limit: 100 },
      enterprise: { traces_limit: -1, api_calls_limit: -1, watched_addresses_limit: -1, pdf_exports_limit: -1 },
    };

    const l = limits[plan];
    await this.db.query(`
      UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2
    `, [plan, userId]);

    await this.db.query(`
      UPDATE usage_quotas SET
        plan = $1,
        traces_limit = $2,
        api_calls_limit = $3,
        watched_addresses_limit = $4,
        pdf_exports_limit = $5,
        updated_at = NOW()
      WHERE user_id = $6
    `, [plan, l.traces_limit, l.api_calls_limit, l.watched_addresses_limit, l.pdf_exports_limit, userId]);
  }

  private generateToken(user: any): string {
    return jwt.sign(
      { userId: user.id, email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      plan: row.plan,
      isActive: row.is_active,
      createdAt: row.created_at,
    };
  }
}
