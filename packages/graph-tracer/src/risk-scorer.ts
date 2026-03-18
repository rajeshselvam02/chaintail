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

export class RiskScorer {
  score(address: string, factors: RiskFactor[]): RiskResult {
    const totalScore = Math.min(100, factors.reduce((sum, f) => sum + f.score, 0));
    return {
      address,
      totalScore,
      level: this.getLevel(totalScore),
      factors,
    };
  }

  factorFromThreatIntel(category: string, confidence: number): RiskFactor {
    const baseScores: Record<string, number> = {
      mixer: 70,
      darknet: 85,
      ransomware: 90,
      sanctioned: 100,
      scam: 75,
      exchange: 10,
      other: 40,
    };
    const base = baseScores[category] ?? 40;
    const score = Math.round((base * confidence) / 100);
    return {
      reason: `Address flagged as ${category} (confidence: ${confidence}%)`,
      score,
      severity: this.getLevel(score),
    };
  }

  factorFromHopDistance(hops: number, sourceRisk: number): RiskFactor {
    // Risk decays with distance
    const decayedScore = Math.round(sourceRisk * Math.pow(0.6, hops - 1));
    return {
      reason: `Connected to high-risk address within ${hops} hop(s)`,
      score: decayedScore,
      severity: this.getLevel(decayedScore),
    };
  }

  factorFromHighVolume(txCount: number): RiskFactor | null {
    if (txCount > 10000) {
      return { reason: 'Unusually high transaction volume', score: 20, severity: 'medium' };
    }
    return null;
  }

  private getLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }
}
