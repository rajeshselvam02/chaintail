import { NodeConnector } from './connector';
import { NodeConfig } from '@chaintail/shared';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export { NodeConnector } from './connector';
export { BitcoinRpcClient } from './rpc-client';
export { BlockstreamApiClient } from './api-client';

if (require.main === module) {
  const config: NodeConfig = {
    rpcHost: process.env.BTC_RPC_HOST || 'localhost',
    rpcPort: parseInt(process.env.BTC_RPC_PORT || '8332'),
    rpcUser: process.env.BTC_RPC_USER || 'bitcoin',
    rpcPassword: process.env.BTC_RPC_PASSWORD || 'bitcoin',
    network: (process.env.BTC_NETWORK as 'mainnet') || 'mainnet',
    useApi: process.env.USE_API === 'true',
  };

  (async () => {
    const connector = new NodeConnector(config);
    await connector.connect();

    const testTxid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
    console.log('\n📦 Fetching first ever BTC transaction...');
    const tx = await connector.getTransaction(testTxid);
    console.log('TxID:', tx.txid);
    console.log('Confirmed:', tx.isConfirmed);
    console.log('Block:', tx.blockHeight);
    console.log('Outputs:', tx.outputs.length);
    console.log('First output to:', tx.outputs[0]?.toAddress);
  })();
}
