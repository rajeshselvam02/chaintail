import { NodeConnector } from '@chaintail/node-connector';
import { NodeConfig } from '@chaintail/shared';
import { WebSocketWatcher } from './websocket-watcher';
import Redis from 'ioredis';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export { WebSocketWatcher } from './websocket-watcher';
export { MempoolWatcher } from './watcher';

const nodeConfig: NodeConfig = {
  rpcHost: process.env.BTC_RPC_HOST || 'localhost',
  rpcPort: parseInt(process.env.BTC_RPC_PORT || '8332'),
  rpcUser: process.env.BTC_RPC_USER || 'bitcoin',
  rpcPassword: process.env.BTC_RPC_PASSWORD || 'bitcoin',
  network: (process.env.BTC_NETWORK as 'mainnet') || 'mainnet',
  useApi: process.env.USE_API === 'true',
};

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'chaintail',
  password: process.env.DB_PASSWORD || 'chaintail',
  database: process.env.DB_NAME || 'chaintail',
});

if (require.main === module) {
  (async () => {
    const connector = new NodeConnector(nodeConfig);
    await connector.connect();

    const watcher = new WebSocketWatcher(connector, redis, db, {
      maxTrackedTxs: 100000,
    });

    watcher.on('new_tx', (entry) => {
      process.stdout.write(`\r🆕 Live txs tracked: ${entry.txid.slice(0,16)}... fee: ${entry.fee} sat        `);
    });

    watcher.on('new_block', (block) => {
      console.log(`\n⛏  Block #${block.height} mined — ${block.tx_count} txs confirmed`);
    });

    watcher.on('address_hit', (address, txid) => {
      console.log(`\n🚨 WATCHED ADDRESS: ${address}`);
      console.log(`   TX: ${txid}`);
    });

    watcher.on('threat_hit', (intel, txid) => {
      console.log(`\n💀 THREAT INTEL HIT: ${intel.label} [${intel.category}]`);
      console.log(`   Address: ${intel.address}`);
      console.log(`   TX: ${txid}`);
    });

    watcher.on('stats', (stats) => {
      console.log(`\n📊 Mempool size: ${stats.mempoolSize} txs | tracked: ${stats.totalTracked}`);
    });

    watcher.on('error', (err) => {
      console.error('\n❌ Error:', err.message);
    });

    process.on('SIGINT', () => {
      console.log('\n\nShutting down...');
      watcher.stop();
      redis.disconnect();
      db.end();
      process.exit(0);
    });

    await watcher.start();
  })();
}
