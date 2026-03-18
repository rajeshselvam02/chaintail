import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NodeConnector } from '@chaintail/node-connector';
import { NodeConfig } from '@chaintail/shared';
import { healthRouter } from './routes/health';
import { addressRouter } from './routes/address';
import { traceRouter } from './routes/trace';
import { clusterRouter } from './routes/cluster';
import { alertsRouter } from './routes/alerts';
import { mempoolRouter } from './routes/mempool';
import { threatIntelRouter } from './routes/threat-intel';
import { webhooksRouter } from './routes/webhooks';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = parseInt(process.env.API_PORT || '3001');
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'chaintail',
  password: process.env.DB_PASSWORD || 'chaintail',
  database: process.env.DB_NAME || 'chaintail',
});
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});
const nodeConfig: NodeConfig = {
  rpcHost: process.env.BTC_RPC_HOST || 'localhost',
  rpcPort: parseInt(process.env.BTC_RPC_PORT || '8332'),
  rpcUser: process.env.BTC_RPC_USER || 'bitcoin',
  rpcPassword: process.env.BTC_RPC_PASSWORD || 'bitcoin',
  network: (process.env.BTC_NETWORK as 'mainnet') || 'mainnet',
  useApi: process.env.USE_API === 'true',
};

async function main() {
  const connector = new NodeConnector(nodeConfig);
  await connector.connect();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use((req, _res, next) => {
    console.log(new Date().toISOString() + ' ' + req.method + ' ' + req.path);
    next();
  });
  app.use('/api/health',       healthRouter(db, redis));
  app.use('/api/address',      addressRouter(db, connector));
  app.use('/api/trace',        traceRouter(db, connector));
  app.use('/api/cluster',      clusterRouter(db));
  app.use('/api/alerts',       alertsRouter(db));
  app.use('/api/mempool',      mempoolRouter(db, redis, connector));
  app.use('/api/threat-intel', threatIntelRouter(db));
  app.use('/api/webhooks',     webhooksRouter(db));
  app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  app.listen(PORT, () => {
    console.log('ChainTrail API running on port ' + PORT);
  });
}
main().catch(console.error);
