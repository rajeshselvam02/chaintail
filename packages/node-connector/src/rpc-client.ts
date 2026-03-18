import axios, { AxiosInstance } from 'axios';
import { NodeConfig } from '@chaintail/shared';

export class BitcoinRpcClient {
  private client: AxiosInstance;
  private requestId = 0;

  constructor(private config: NodeConfig) {
    this.client = axios.create({
      baseURL: `http://${config.rpcHost}:${config.rpcPort}`,
      auth: { username: config.rpcUser, password: config.rpcPassword },
      timeout: 30000,
    });
  }

  async call<T = any>(method: string, params: any[] = []): Promise<T> {
    const response = await this.client.post('/', {
      jsonrpc: '1.0',
      id: ++this.requestId,
      method,
      params,
    });
    if (response.data.error) {
      throw new Error(`RPC Error [${method}]: ${response.data.error.message}`);
    }
    return response.data.result as T;
  }

  async getBlockCount(): Promise<number> { return this.call<number>('getblockcount'); }
  async getRawTransaction(txid: string, verbose = true): Promise<any> { return this.call('getrawtransaction', [txid, verbose]); }
  async getRawMempool(verbose = false): Promise<any> { return this.call('getrawmempool', [verbose]); }
  async getMempoolEntry(txid: string): Promise<any> { return this.call('getmempoolentry', [txid]); }
  async getBlockHash(height: number): Promise<string> { return this.call<string>('getblockhash', [height]); }

  async ping(): Promise<boolean> {
    try { await this.call('ping'); return true; }
    catch { return false; }
  }
}
