import { Pool } from 'pg';
export interface ClusterResult {
    clusterId: string;
    addresses: string[];
    size: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
    riskScore: number;
    hasThreatIntel: boolean;
    threatCategories: string[];
}
export interface ClusterStats {
    totalAddresses: number;
    totalClusters: number;
    clustersWithThreat: number;
    largestClusterSize: number;
    processingTimeMs: number;
}
export declare class ClusteringEngine {
    private db;
    constructor(db: Pool);
    clusterAll(): Promise<ClusterStats>;
    getClusterForAddress(address: string): Promise<ClusterResult | null>;
    private persistClusters;
    private propagateRisk;
    private getClusterThreatCategories;
}
