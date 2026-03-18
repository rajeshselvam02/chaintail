import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { ClusteringEngine } from '@chaintail/clustering';

export function clusterRouter(db: Pool): Router {
  const router = Router();
  const engine = new ClusteringEngine(db);
  router.get('/:address', async (req: Request, res: Response) => {
    try {
      const cluster = await engine.getClusterForAddress(req.params.address);
      if (!cluster) return res.status(404).json({ error: 'No cluster found' });
      return res.json(cluster);
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  router.post('/run', async (_req: Request, res: Response) => {
    try { return res.json(await engine.clusterAll()); }
    catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  return router;
}
