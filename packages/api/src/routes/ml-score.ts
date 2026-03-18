import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { FeatureExtractor, MLScorer } from '@chaintail/ml-scorer';

export function mlScoreRouter(db: Pool): Router {
  const router = Router();
  const extractor = new FeatureExtractor(db);
  const scorer = new MLScorer();

  router.get('/:address', async (req: Request, res: Response) => {
    try {
      const features = await extractor.extract(req.params.address);
      const result = scorer.score(features);

      // Persist
      await db.query(`
        INSERT INTO addresses (address, risk_score, labels)
        VALUES ($1, $2, ARRAY[$3])
        ON CONFLICT (address) DO UPDATE SET
          risk_score = $2,
          labels = array_append(addresses.labels, $3)
      `, [req.params.address, result.score, `ml:${result.level}`]);

      return res.json({ ...result, features });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
