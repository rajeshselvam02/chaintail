import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { GraphTracer } from '@chaintail/graph-tracer';
import { NodeConnector } from '@chaintail/node-connector';

export function traceRouter(db: Pool, connector: NodeConnector): Router {
  const router = Router();
  router.post('/', async (req: Request, res: Response) => {
    const { address, hops = 5, direction = 'backward' } = req.body;
    if (!address) return res.status(400).json({ error: 'address is required' });
    try {
      const tracer = new GraphTracer(db, connector);
      return res.json(await tracer.trace(address, hops, direction));
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  router.get('/:address', async (req: Request, res: Response) => {
    const hops = parseInt(req.query.hops as string || '3');
    const direction = (req.query.direction as 'backward' | 'forward') || 'backward';
    try {
      const tracer = new GraphTracer(db, connector);
      return res.json(await tracer.trace(req.params.address, hops, direction));
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  });
  return router;
}
