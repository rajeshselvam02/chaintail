import { BitcoinTransaction, AddressInfo } from '@chaintail/shared';
export declare class BlockstreamApiClient {
    private client;
    constructor(network?: 'mainnet' | 'testnet');
    getTransaction(txid: string): Promise<BitcoinTransaction>;
    getAddressInfo(address: string): Promise<AddressInfo>;
    getAddressTransactions(address: string): Promise<BitcoinTransaction[]>;
    getMempoolTxids(): Promise<string[]>;
    getMempoolStats(): Promise<any>;
    private mapTransaction;
}
