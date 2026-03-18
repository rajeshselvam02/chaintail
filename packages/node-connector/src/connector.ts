import { BitcoinRpcClient } from './rpc-client';
import { BlockstreamApiClient } from './api-client';
import { BitcoinTransaction, NodeConfig } from '@chaintail/shared';

export class NodeConnector {
  private rpc: BitcoinRpcClient | null = null;
  private api: BlockstreamApiClient;
  private useRpc = false;

  constructor(private config: NodeConfig) {
    this.api = new BlockstreamApiClient(config.network === 'mainnet' ? 'mainnet' : 'testnet');
    if (!config.useApi) {
      this.rpc = new BitcoinRpcClient(config);
    }
  }

  async connect(): Promise<void> {
    if (this.rpc) {
      const alive = await this.rpc.ping();
      if (alive) {
        this.useRpc = true;
        console.log('✅ Connected to Bitcoin Core via RPC');
        return;
      }
      console.warn('⚠️  Bitcoin Core RPC not reachable, falling back to Blockstream API');
    }
    console.log('✅ Using Blockstream API');
  }

  async getTransaction(txid: string): Promise<BitcoinTransaction> {
    if (this.useRpc && this.rpc) {
      const raw = await this.rpc.getRawTransaction(txid, true);
      return this.mapRpcTransaction(raw);
    }
    return this.api.getTransaction(txid);
  }

  async getMempoolTxids(): Promise<string[]> {
    if (this.useRpc && this.rpc) {
      const mempool = await this.rpc.getRawMempool(false);
      return Array.isArray(mempool) ? mempool : Object.keys(mempool);
    }
    return this.api.getMempoolTxids();
  }

  async getAddressTransactions(address: string): Promise<BitcoinTransaction[]> {
    return this.api.getAddressTransactions(address);
  }

  async getAddressInfo(address: string) {
    return this.api.getAddressInfo(address);
  }

  isUsingRpc(): boolean { return this.useRpc; }

  private mapRpcTransaction(raw: any): BitcoinTransaction {
    return {
      txid: raw.txid,
      blockHeight: raw.height ?? null,
      blockHash: raw.blockhash ?? null,
      timestamp: raw.time ?? null,
      fee: 0,
      size: raw.size ?? 0,
      isConfirmed: !!raw.blockhash,
      inputs: (raw.vin || []).map((vin: any) => ({
        txid: raw.txid,
        vout: vin.vout ?? 0,
        fromAddress: null,
        valueSatoshi: 0,
        sequence: vin.sequence,
      })),
      outputs: (raw.vout || []).map((vout: any, i: number) => ({
        n: i,
        toAddress: vout.scriptPubKey?.addresses?.[0] ?? vout.scriptPubKey?.address ?? null,
        valueSatoshi: Math.round((vout.value ?? 0) * 1e8),
        scriptType: vout.scriptPubKey?.type ?? 'unknown',
        spent: false,
      })),
    };
  }
}
