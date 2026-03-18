export interface RiskFactor {
    reason: string;
    score: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
export interface RiskResult {
    address: string;
    totalScore: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: RiskFactor[];
}
export declare class RiskScorer {
    score(address: string, factors: RiskFactor[]): RiskResult;
    factorFromThreatIntel(category: string, confidence: number): RiskFactor;
    factorFromHopDistance(hops: number, sourceRisk: number): RiskFactor;
    factorFromHighVolume(txCount: number): RiskFactor | null;
    private getLevel;
}
