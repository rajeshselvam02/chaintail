import axios, { AxiosInstance } from 'axios';

const ETHERSCAN_BASE = 'https://api.etherscan.io/v2/api';
const ETHERSCAN_FREE_DELAY = 250; // ms between requests on free tier

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface EthTransaction {
  txhash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasPrice: string;
  isError: boolean;
}

export interface EthTokenTransfer {
  txhash: string;
  from: string;
  to: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  value: string;
  blockNumber: number;
  timestamp: number;
}

export interface EthAddressInfo {
  address: string;
  balanceWei: string;
  balanceEth: string;
  txCount: number;
  isContract: boolean;
}

export class EtherscanClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey = 'YourApiKeyToken') {
    this.apiKey = apiKey;
    this.client = axios.create({ baseURL: ETHERSCAN_BASE, timeout: 15000 });
  }

  async getAddressInfo(address: string): Promise<EthAddressInfo> {
    const [balanceRes, txCountRes] = await Promise.all([
      this.client.get('', { params: { chainid: 1, module: 'account', action: 'balance', address, tag: 'latest', apikey: this.apiKey } }),
      this.client.get('', { params: { chainid: 1, module: 'proxy', action: 'eth_getTransactionCount', address, tag: 'latest', apikey: this.apiKey } }),
    ]);

    const balanceWei = balanceRes.data.result || '0';
    const balanceEth = (parseInt(balanceWei) / 1e18).toFixed(6);
    const txCount = parseInt(txCountRes.data.result || '0x0', 16);

    // Check if contract
    const codeRes = await this.client.get('', {
      params: { chainid: 1, module: 'proxy', action: 'eth_getCode', address, tag: 'latest', apikey: this.apiKey }
    });
    const isContract = codeRes.data.result !== '0x';

    return { address, balanceWei, balanceEth, txCount, isContract };
  }

  async getTransactions(address: string, limit = 20): Promise<EthTransaction[]> {
    await sleep(ETHERSCAN_FREE_DELAY);
    const { data } = await this.client.get('', {
      params: {
        chainid: 1, module: 'account', action: 'txlist',
        address, startblock: 0, endblock: 99999999,
        page: 1, offset: limit, sort: 'desc',
        apikey: this.apiKey,
      }
    });

    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    return data.result.map((tx: any) => ({
      txhash: tx.hash,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasUsed: parseInt(tx.gasUsed),
      gasPrice: tx.gasPrice,
      isError: tx.isError === '1',
    }));
  }

  async getTokenTransfers(address: string, limit = 20): Promise<EthTokenTransfer[]> {
    await sleep(ETHERSCAN_FREE_DELAY);
    const { data } = await this.client.get('', {
      params: {
        chainid: 1, module: 'account', action: 'tokentx',
        address, startblock: 0, endblock: 99999999,
        page: 1, offset: limit, sort: 'desc',
        apikey: this.apiKey,
      }
    });

    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    return data.result.map((tx: any) => ({
      txhash: tx.hash,
      from: tx.from,
      to: tx.to,
      tokenAddress: tx.contractAddress,
      tokenName: tx.tokenName,
      tokenSymbol: tx.tokenSymbol,
      value: tx.value,
      blockNumber: parseInt(tx.blockNumber),
      timestamp: parseInt(tx.timeStamp),
    }));
  }

  async traceAddress(address: string, hops = 3): Promise<Map<string, string[]>> {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const queue = [{ address: address.toLowerCase(), hop: 0 }];

    while (queue.length > 0) {
      const { address: addr, hop } = queue.shift()!;
      if (visited.has(addr) || hop >= hops) continue;
      visited.add(addr);

      try {
        const txs = await this.getTransactions(addr, 10);
        const connected: string[] = [];

        for (const tx of txs) {
          const other = tx.from.toLowerCase() === addr ? tx.to.toLowerCase() : tx.from.toLowerCase();
          if (other && other !== addr) {
            connected.push(other);
            if (hop + 1 < hops) {
              queue.push({ address: other, hop: hop + 1 });
            }
          }
        }

        graph.set(addr, connected);
        await sleep(300);
      } catch {
        graph.set(addr, []);
      }
    }

    return graph;
  }
}
