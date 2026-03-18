import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EntityLookup } from '@chaintail/entity-labels';

export function entitiesRouter(db: Pool): Router {
  const router = Router();
  const lookup = new EntityLookup(db);

  // GET /api/entities/lookup/:address
  router.get('/lookup/:address', async (req: Request, res: Response) => {
    try {
      const result = await lookup.lookupAddress(req.params.address);
      if (!result) return res.status(404).json({ found: false });
      return res.json({ found: true, entity: result });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/entities/lookup/batch
  router.post('/lookup/batch', async (req: Request, res: Response) => {
    const { addresses } = req.body;
    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({ error: 'addresses array required' });
    }
    try {
      const results = await lookup.lookupAddresses(addresses);
      const obj: Record<string, any> = {};
      results.forEach((v, k) => { obj[k] = v; });
      return res.json({ found: obj });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/entities/search?q=binance
  router.get('/search', async (req: Request, res: Response) => {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'q query param required' });
    try {
      const results = await lookup.searchEntities(q);
      return res.json({ count: results.length, entities: results });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/entities/stats
  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const stats = await lookup.getStats();
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
