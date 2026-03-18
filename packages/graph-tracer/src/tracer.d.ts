import { Pool } from 'pg';
import { NodeConnector } from '@chaintail/node-connector';
import { RiskResult } from './risk-scorer';
export interface TraceNode {
    address: string;
    txid: string;
    valueSatoshi: number;
    hop: number;
    path: string[];
    riskScore?: number;
    threatLabel?: string;
    threatCategory?: string;
}
export interface TraceResult {
    targetAddress: string;
    direction: 'backward' | 'forward';
    hops: number;
    nodes: TraceNode[];
    riskResult: RiskResult;
    flaggedAddresses: TraceNode[];
    totalValueTraced: number;
}
export declare class GraphTracer {
    private db;
    private connector;
    private scorer;
    constructor(db: Pool, connector: NodeConnector);
    trace(address: string, hops?: number, direction?: 'backward' | 'forward'): Promise<TraceResult>;
    private ingestAddressTransactions;
    private saveTx;
    private checkThreatIntel;
}
