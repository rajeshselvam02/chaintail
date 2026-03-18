import { Pool } from 'pg';

export interface Case {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'active' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  investigator?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseAddress {
  id: string;
  caseId: string;
  address: string;
  label?: string;
  role: string;
  notes?: string;
  addedAt: Date;
}

export class CaseManager {
  constructor(private db: Pool) {}

  async createCase(data: {
    title: string;
    description?: string;
    priority?: string;
    investigator?: string;
    tags?: string[];
  }): Promise<Case> {
    const { rows } = await this.db.query(`
      INSERT INTO cases (title, description, priority, investigator, tags)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [data.title, data.description, data.priority || 'medium',
        data.investigator, data.tags || []]);
    return this.mapCase(rows[0]);
  }

  async getCases(status?: string): Promise<Case[]> {
    let query = `
      SELECT c.*,
        COUNT(DISTINCT ca.id) AS address_count,
        COUNT(DISTINCT cn.id) AS note_count
      FROM cases c
      LEFT JOIN case_addresses ca ON ca.case_id = c.id
      LEFT JOIN case_notes cn ON cn.case_id = c.id
    `;
    const params: any[] = [];
    if (status) {
      query += ` WHERE c.status = $1`;
      params.push(status);
    }
    query += ` GROUP BY c.id ORDER BY c.updated_at DESC`;
    const { rows } = await this.db.query(query, params);
    return rows.map(this.mapCase);
  }

  async getCase(id: string): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT c.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', ca.id, 'address', ca.address,
          'label', ca.label, 'role', ca.role, 'notes', ca.notes
        )) FILTER (WHERE ca.id IS NOT NULL) AS addresses,
        json_agg(DISTINCT jsonb_build_object(
          'id', cn.id, 'content', cn.content,
          'author', cn.author, 'created_at', cn.created_at
        )) FILTER (WHERE cn.id IS NOT NULL) AS notes,
        json_agg(DISTINCT jsonb_build_object(
          'id', ce.id, 'type', ce.type,
          'description', ce.description, 'data', ce.data
        )) FILTER (WHERE ce.id IS NOT NULL) AS evidence
      FROM cases c
      LEFT JOIN case_addresses ca ON ca.case_id = c.id
      LEFT JOIN case_notes cn ON cn.case_id = c.id
      LEFT JOIN case_evidence ce ON ce.case_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);
    return rows[0] || null;
  }

  async updateCase(id: string, data: Partial<Case>): Promise<Case> {
    const { rows } = await this.db.query(`
      UPDATE cases SET
        title = COALESCE($2, title),
        description = COALESCE($3, description),
        status = COALESCE($4, status),
        priority = COALESCE($5, priority),
        updated_at = NOW(),
        closed_at = CASE WHEN $4 = 'closed' THEN NOW() ELSE closed_at END
      WHERE id = $1
      RETURNING *
    `, [id, data.title, data.description, data.status, data.priority]);
    return this.mapCase(rows[0]);
  }

  async addAddress(caseId: string, data: {
    address: string;
    label?: string;
    role?: string;
    notes?: string;
  }): Promise<CaseAddress> {
    const { rows } = await this.db.query(`
      INSERT INTO case_addresses (case_id, address, label, role, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (case_id, address) DO UPDATE SET
        label = EXCLUDED.label, notes = EXCLUDED.notes
      RETURNING *
    `, [caseId, data.address, data.label, data.role || 'suspect', data.notes]);
    return rows[0];
  }

  async addNote(caseId: string, content: string, author = 'investigator'): Promise<any> {
    const { rows } = await this.db.query(`
      INSERT INTO case_notes (case_id, content, author)
      VALUES ($1, $2, $3) RETURNING *
    `, [caseId, content, author]);
    await this.db.query(`UPDATE cases SET updated_at = NOW() WHERE id = $1`, [caseId]);
    return rows[0];
  }

  async addEvidence(caseId: string, data: {
    type: string;
    referenceId?: string;
    description?: string;
    data?: any;
  }): Promise<any> {
    const { rows } = await this.db.query(`
      INSERT INTO case_evidence (case_id, type, reference_id, description, data)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [caseId, data.type, data.referenceId, data.description, JSON.stringify(data.data || {})]);
    return rows[0];
  }

  async deleteCase(id: string): Promise<void> {
    await this.db.query(`DELETE FROM cases WHERE id = $1`, [id]);
  }

  private mapCase(row: any): Case {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      investigator: row.investigator,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
