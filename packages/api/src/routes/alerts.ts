import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function alertsRouter(db: Pool): Router {
  const router = Router();
  router.get('/', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string || '50');
    const severity = req.query.severity as string;
    try {
      let query = `SELECT id, address, txid, reason, severity, metadata, triggered_at, acknowledged FROM alerts WHERE 1=1`;
      const params: any[] = [];
      if (severity) { params.push(severity); query += ` AND severity = $${params.length}`; }
      if (req.query.unacknowledged === 'true') query += ` AND acknowledged = false`;
      params.push(limit);
      query += ` ORDER BY triggered_at DESC LIMIT $${params.length}`;
      const { rows } = await db.query(query, params);
      return res.json({ count: rows.length, alerts: rows });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  router.patch('/:id/acknowledge', async (req: Request, res: Response) => {
    try {
      await db.query(`UPDATE alerts SET acknowledged = true WHERE id = $1`, [req.params.id]);
      return res.json({ success: true });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  return router;
}
