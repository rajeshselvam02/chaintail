import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function webhooksRouter(db: Pool): Router {
  const router = Router();

  // GET /api/webhooks
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const { rows } = await db.query(`SELECT id, name, url, events, active, created_at FROM webhooks ORDER BY created_at DESC`);
      return res.json({ count: rows.length, webhooks: rows });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // POST /api/webhooks
  router.post('/', async (req: Request, res: Response) => {
    const { name, url, events = ['address_hit'], secret } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'name and url required' });
    try {
      const { rows } = await db.query(
        `INSERT INTO webhooks (name, url, events, secret) VALUES ($1,$2,$3,$4) RETURNING *`,
        [name, url, events, secret || null]
      );
      return res.status(201).json(rows[0]);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/webhooks/:id
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await db.query(`DELETE FROM webhooks WHERE id = $1`, [req.params.id]);
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // GET /api/webhooks/watched
  router.get('/watched', async (_req: Request, res: Response) => {
    try {
      const { rows } = await db.query(`SELECT * FROM watched_addresses WHERE active = true ORDER BY created_at DESC`);
      return res.json({ count: rows.length, addresses: rows });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // POST /api/webhooks/watched
  router.post('/watched', async (req: Request, res: Response) => {
    const { address, label } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });
    try {
      await db.query(`
        INSERT INTO watched_addresses (address, label) VALUES ($1, $2)
        ON CONFLICT (address) DO UPDATE SET active = true, label = $2
      `, [address, label || address]);
      return res.status(201).json({ success: true, address });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/webhooks/watched/:address
  router.delete('/watched/:address', async (req: Request, res: Response) => {
    try {
      await db.query(`UPDATE watched_addresses SET active = false WHERE address = $1`, [req.params.address]);
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });

  return router;
}
