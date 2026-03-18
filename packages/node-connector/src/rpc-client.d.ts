import { NodeConfig } from '@chaintail/shared';
export declare class BitcoinRpcClient {
    private config;
    private client;
    private requestId;
    constructor(config: NodeConfig);
    call<T = any>(method: string, params?: any[]): Promise<T>;
    getBlockCount(): Promise<number>;
    getRawTransaction(txid: string, verbose?: boolean): Promise<any>;
    getRawMempool(verbose?: boolean): Promise<any>;
    getMempoolEntry(txid: string): Promise<any>;
    getBlockHash(height: number): Promise<string>;
    ping(): Promise<boolean>;
}
