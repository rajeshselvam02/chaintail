import axios, { AxiosInstance } from 'axios';
import { BitcoinTransaction, TxInput, TxOutput, AddressInfo } from '@chaintail/shared';

export class BlockstreamApiClient {
  private client: AxiosInstance;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    const baseURL = network === 'mainnet'
      ? 'https://blockstream.info/api'
      : 'https://blockstream.info/testnet/api';
    this.client = axios.create({ baseURL, timeout: 15000 });
  }

  async getTransaction(txid: string): Promise<BitcoinTransaction> {
    const { data } = await this.client.get(`/tx/${txid}`);
    return this.mapTransaction(data);
  }

  async getAddressInfo(address: string): Promise<AddressInfo> {
    const { data } = await this.client.get(`/address/${address}`);
    return {
      address,
      balance: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
      totalReceived: data.chain_stats.funded_txo_sum,
      totalSent: data.chain_stats.spent_txo_sum,
      txCount: data.chain_stats.tx_count,
    };
  }

  async getAddressTransactions(address: string): Promise<BitcoinTransaction[]> {
    const { data } = await this.client.get(`/address/${address}/txs`);
    return data.map((tx: any) => this.mapTransaction(tx));
  }

  async getMempoolTxids(): Promise<string[]> {
    const { data } = await this.client.get('/mempool/txids');
    return data;
  }

  async getMempoolStats(): Promise<any> {
    const { data } = await this.client.get('/mempool');
    return data;
  }

  private mapTransaction(data: any): BitcoinTransaction {
    const inputs: TxInput[] = data.vin.map((vin: any) => ({
      txid: data.txid,
      vout: vin.vout ?? 0,
      fromAddress: vin.prevout?.scriptpubkey_address ?? null,
      valueSatoshi: vin.prevout?.value ?? 0,
      sequence: vin.sequence,
    }));
    const outputs: TxOutput[] = data.vout.map((vout: any, i: number) => ({
      n: i,
      toAddress: vout.scriptpubkey_address ?? null,
      valueSatoshi: vout.value ?? 0,
      scriptType: vout.scriptpubkey_type ?? 'unknown',
      spent: false,
    }));
    return {
      txid: data.txid,
      blockHeight: data.status?.block_height ?? null,
      blockHash: data.status?.block_hash ?? null,
      timestamp: data.status?.block_time ?? null,
      fee: data.fee ?? 0,
      size: data.size ?? 0,
      isConfirmed: data.status?.confirmed ?? false,
      inputs,
      outputs,
    };
  }
}
