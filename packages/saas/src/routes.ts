import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { AuthService } from './auth';

export function saasRouter(db: Pool): Router {
  const router = Router();
  const authService = new AuthService(db);

  // POST /api/auth/register
  router.post('/register', async (req: Request, res: Response) => {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'password must be 8+ characters' });
    try {
      const result = await authService.register(email, password, name);
      return res.status(201).json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    try {
      const result = await authService.login(email, password);
      return res.json(result);
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }
  });

  // GET /api/auth/me
  router.get('/me', async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const quota = await authService.getQuota(user.id);
      return res.json({ user, quota });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/api-keys
  router.post('/api-keys', async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    const { name } = req.body;
    try {
      const result = await authService.generateApiKey(user.id, name);
      return res.status(201).json({
        ...result,
        warning: 'Save this key now — it will not be shown again',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/auth/api-keys
  router.get('/api-keys', async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const { rows } = await db.query(`
        SELECT id, key_prefix, name, is_active, last_used_at, expires_at, created_at
        FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC
      `, [user.id]);
      return res.json({ keys: rows });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/auth/usage
  router.get('/usage', async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const quota = await authService.getQuota(user.id);
      const { rows: logs } = await db.query(`
        SELECT endpoint, method, status_code, created_at
        FROM usage_logs WHERE user_id = $1
        ORDER BY created_at DESC LIMIT 50
      `, [user.id]);
      return res.json({ quota, recentLogs: logs });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/auth/plans
  router.get('/plans', async (_req: Request, res: Response) => {
    try {
      const { rows } = await db.query(
        `SELECT * FROM plans WHERE is_active = true ORDER BY price_usd ASC`
      );
      return res.json({ plans: rows });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
