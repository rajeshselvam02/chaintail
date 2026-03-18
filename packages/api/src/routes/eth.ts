import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EthTracer, EtherscanClient } from '@chaintail/eth-connector';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function ethRouter(db: Pool): Router {
  const router = Router();
  const tracer = new EthTracer(db, process.env.ETHERSCAN_API_KEY);
  const client = new EtherscanClient(process.env.ETHERSCAN_API_KEY);

  // GET /api/eth/address/:address
  router.get('/address/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    if (!ETH_ADDRESS_REGEX.test(address)) {
      return res.status(400).json({ error: 'Invalid ETH address format' });
    }
    try {
      const info = await client.getAddressInfo(address);
      return res.json(info);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/eth/trace/:address?hops=3
  router.get('/trace/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    const hops = parseInt(req.query.hops as string || '3');
    if (!ETH_ADDRESS_REGEX.test(address)) {
      return res.status(400).json({ error: 'Invalid ETH address format' });
    }
    try {
      const result = await tracer.trace(address, hops);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /api/eth/transactions/:address
  router.get('/transactions/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    try {
      const { rows } = await db.query(`
        SELECT * FROM eth_transactions
        WHERE from_address = $1 OR to_address = $1
        ORDER BY timestamp DESC LIMIT 20
      `, [address.toLowerCase()]);
      return res.json({ count: rows.length, transactions: rows });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
