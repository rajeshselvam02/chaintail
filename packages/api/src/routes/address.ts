import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { NodeConnector } from '@chaintail/node-connector';

export function addressRouter(db: Pool, connector: NodeConnector): Router {
  const router = Router();

  // GET /api/address/:address
  router.get('/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    try {
      // Get from DB first
      const { rows } = await db.query(`
        SELECT
          a.address,
          a.risk_score,
          a.labels,
          a.first_seen,
          a.last_seen,
          a.tx_count,
          a.total_received,
          a.total_sent,
          c.id AS cluster_id,
          c.risk_level AS cluster_risk_level,
          (SELECT COUNT(*) FROM addresses WHERE cluster_id = c.id) AS cluster_size
        FROM addresses a
        LEFT JOIN clusters c ON c.id = a.cluster_id
        WHERE a.address = $1
      `, [address]);

      if (rows.length > 0) {
        return res.json({ source: 'db', data: rows[0] });
      }

      // Fallback to live API
      const info = await connector.getAddressInfo(address);
      return res.json({ source: 'live', data: info });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/address/:address/transactions
  router.get('/:address/transactions', async (req: Request, res: Response) => {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string || '20');
    try {
      const { rows } = await db.query(`
        SELECT DISTINCT
          t.txid,
          t.block_height,
          t.timestamp,
          t.fee,
          t.is_confirmed,
          t.first_seen
        FROM transactions t
        LEFT JOIN tx_inputs i ON i.txid = t.txid AND i.from_address = $1
        LEFT JOIN tx_outputs o ON o.txid = t.txid AND o.to_address = $1
        WHERE i.from_address = $1 OR o.to_address = $1
        ORDER BY t.first_seen DESC
        LIMIT $2
      `, [address, limit]);

      return res.json({ address, count: rows.length, transactions: rows });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
