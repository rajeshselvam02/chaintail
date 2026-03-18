export interface BitcoinTransaction {
  txid: string;
  blockHeight: number | null;
  blockHash: string | null;
  timestamp: number | null;
  fee: number;
  size: number;
  isConfirmed: boolean;
  inputs: TxInput[];
  outputs: TxOutput[];
}

export interface TxInput {
  txid: string;
  vout: number;
  fromAddress: string | null;
  valueSatoshi: number;
  sequence: number;
}

export interface TxOutput {
  n: number;
  toAddress: string | null;
  valueSatoshi: number;
  scriptType: string;
  spent: boolean;
}

export interface MempoolEntry {
  txid: string;
  fee: number;
  size: number;
  time: number;
  descendantCount: number;
  ancestorCount: number;
  rawTx?: BitcoinTransaction;
}

export interface AddressInfo {
  address: string;
  balance: number;
  totalReceived: number;
  totalSent: number;
  txCount: number;
  riskScore?: number;
  labels?: string[];
}

export interface NodeConfig {
  rpcHost: string;
  rpcPort: number;
  rpcUser: string;
  rpcPassword: string;
  network: 'mainnet' | 'testnet' | 'signet';
  useApi: boolean;
  apiBaseUrl?: string;
}

export interface ChainTrailConfig {
  node: NodeConfig;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
  };
  redis: {
    host: string;
    port: number;
  };
  mempool: {
    pollIntervalMs: number;
    maxTrackedTxs: number;
  };
}
