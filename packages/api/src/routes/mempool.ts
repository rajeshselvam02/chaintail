import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { NodeConnector } from '@chaintail/node-connector';

export function mempoolRouter(db: Pool, redis: Redis, _connector: NodeConnector): Router {
  const router = Router();
  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const { rows } = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE confirmed_at IS NULL AND dropped_at IS NULL) AS pending,
          COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) AS confirmed,
          COUNT(*) FILTER (WHERE dropped_at IS NOT NULL) AS dropped,
          ROUND(AVG(fee_rate) FILTER (WHERE confirmed_at IS NULL AND dropped_at IS NULL), 2) AS avg_fee_rate
        FROM mempool_snapshots WHERE first_seen > NOW() - INTERVAL '1 hour'
      `);
      return res.json(rows[0]);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  router.get('/recent', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string || '20');
    try {
      const { rows } = await db.query(
        `SELECT txid, fee, size, fee_rate, first_seen, confirmed_at, dropped_at FROM mempool_snapshots ORDER BY first_seen DESC LIMIT $1`,
        [limit]
      );
      return res.json({ count: rows.length, transactions: rows });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  router.get('/tx/:txid', async (req: Request, res: Response) => {
    try {
      const cached = await redis.get(`mempool:${req.params.txid}`);
      if (cached) return res.json({ source: 'cache', data: JSON.parse(cached) });
      const { rows } = await db.query(`SELECT * FROM mempool_snapshots WHERE txid = $1`, [req.params.txid]);
      if (rows.length > 0) return res.json({ source: 'db', data: rows[0] });
      return res.status(404).json({ error: 'Transaction not found' });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  return router;
}
