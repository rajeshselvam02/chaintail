import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { PatternDetector } from '@chaintail/pattern-detector';

export function patternsRouter(db: Pool): Router {
  const router = Router();
  const detector = new PatternDetector(db);

  router.get('/analyze/:address', async (req: Request, res: Response) => {
    try {
      const matches = await detector.analyzeAddress(req.params.address);
      return res.json({
        address: req.params.address,
        patternsFound: matches.length,
        patterns: matches,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
