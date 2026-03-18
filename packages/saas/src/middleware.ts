import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AuthService } from './auth';

export function createAuthMiddleware(db: Pool) {
  const authService = new AuthService(db);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let user = null;

      // Check Bearer token
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        try {
          user = await authService.verifyToken(token);
        } catch { }
      }

      // Check API key header
      if (!user) {
        const apiKey = req.headers['x-api-key'] as string;
        if (apiKey) {
          user = await authService.verifyApiKey(apiKey);
        }
      }

      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Provide Bearer token or X-API-Key header',
        });
      }

      (req as any).user = user;

      // Log usage
      await db.query(`
        INSERT INTO usage_logs (user_id, endpoint, method, ip_address)
        VALUES ($1, $2, $3, $4)
      `, [user.id, req.path, req.method, req.ip]).catch(() => {});

      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }
  };
}

export function createQuotaMiddleware(db: Pool, type: 'traces' | 'api_calls' | 'pdf_exports') {
  const authService = new AuthService(db);

  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return next();

    const allowed = await authService.incrementUsage(user.id, type);
    if (!allowed) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: `You have reached your ${type} limit for this month`,
        upgrade: 'https://chaintail.io/pricing',
      });
    }

    next();
  };
}

export function requirePlan(minPlan: 'free' | 'pro' | 'enterprise') {
  const planLevels: Record<string, number> = { free: 0, pro: 1, enterprise: 2 };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Authentication required' });

    const userLevel = planLevels[user.plan] ?? 0;
    const requiredLevel = planLevels[minPlan] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        message: `This feature requires ${minPlan} plan or higher`,
        currentPlan: user.plan,
        requiredPlan: minPlan,
        upgrade: 'https://chaintail.io/pricing',
      });
    }

    next();
  };
}
