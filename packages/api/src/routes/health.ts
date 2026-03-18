import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

export function healthRouter(db: Pool, redis: Redis): Router {
  const router = Router();
  router.get('/', async (_req: Request, res: Response) => {
    const checks: Record<string, string> = {};
    try { await db.query('SELECT 1'); checks.postgres = 'ok'; } catch { checks.postgres = 'error'; }
    try { await redis.ping(); checks.redis = 'ok'; } catch { checks.redis = 'error'; }
    const allOk = Object.values(checks).every(v => v === 'ok');
    res.status(allOk ? 200 : 503).json({ status: allOk ? 'ok' : 'degraded', version: '0.1.0', checks, timestamp: new Date().toISOString() });
  });
  return router;
}
