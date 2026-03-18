import { BitcoinTransaction, NodeConfig } from '@chaintail/shared';
export declare class NodeConnector {
    private config;
    private rpc;
    private api;
    private useRpc;
    constructor(config: NodeConfig);
    connect(): Promise<void>;
    getTransaction(txid: string): Promise<BitcoinTransaction>;
    getMempoolTxids(): Promise<string[]>;
    getAddressTransactions(address: string): Promise<BitcoinTransaction[]>;
    getAddressInfo(address: string): Promise<import("@chaintail/shared").AddressInfo>;
    isUsingRpc(): boolean;
    private mapRpcTransaction;
}
