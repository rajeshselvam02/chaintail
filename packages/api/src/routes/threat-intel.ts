import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function threatIntelRouter(db: Pool): Router {
  const router = Router();
  const valid = ['mixer','darknet','exchange','scam','ransomware','sanctioned','other'];
  router.get('/', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string || '50');
    const category = req.query.category as string;
    try {
      let query = `SELECT * FROM threat_intel WHERE 1=1`;
      const params: any[] = [];
      if (category) { params.push(category); query += ` AND category = $${params.length}`; }
      params.push(limit);
      query += ` ORDER BY added_at DESC LIMIT $${params.length}`;
      const { rows } = await db.query(query, params);
      return res.json({ count: rows.length, entries: rows });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  router.post('/', async (req: Request, res: Response) => {
    const { address, label, category, source, confidence = 100 } = req.body;
    if (!address || !label || !category) return res.status(400).json({ error: 'address, label, category required' });
    if (!valid.includes(category)) return res.status(400).json({ error: `category must be one of: ${valid.join(', ')}` });
    try {
      const { rows } = await db.query(
        `INSERT INTO threat_intel (address, label, category, source, confidence) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [address, label, category, source || 'manual', confidence]
      );
      return res.status(201).json(rows[0]);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await db.query(`DELETE FROM threat_intel WHERE id = $1`, [req.params.id]);
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  return router;
}
