import { AddressFeatures } from './features';

export interface MLScoreResult {
  address: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  factors: ScoreFactor[];
  explanation: string;
}

export interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
  description: string;
}

/**
 * Logistic regression-inspired scorer
 * Uses weighted features with sigmoid normalization
 * Weights tuned based on known bad actor characteristics
 */
export class MLScorer {
  private weights = {
    hasThreatIntel:       { ransomware: 95, sanctioned: 100, darknet: 90, mixer: 75, scam: 70, other: 40 },
    hopsToBadActor:       { 1: 60, 2: 45, 3: 30, 4: 15, 5: 8 },
    clusterRisk:          { critical: 50, high: 35, medium: 20, low: 5, unknown: 0 },
    txFrequency:          { threshold: 100, weight: 15 },
    fanOut:               { threshold: 50, weight: 20 },
    fanIn:                { threshold: 50, weight: 15 },
    roundNumbers:         { threshold: 0.8, weight: 10 },
    mempoolHits:          { threshold: 3, weight: 10 },
    isExchange:           -30,
    isMiningPool:         -20,
  };

  score(features: AddressFeatures): MLScoreResult {
    const factors: ScoreFactor[] = [];
    let rawScore = 0;

    // Threat intel — highest weight
    if (features.hasThreatIntel && features.threatCategory) {
      const threatWeight = this.weights.hasThreatIntel[
        features.threatCategory as keyof typeof this.weights.hasThreatIntel
      ] || 40;
      factors.push({
        name: 'Threat Intelligence',
        weight: threatWeight,
        value: 1,
        contribution: threatWeight,
        description: `Flagged in threat intel as ${features.threatCategory}`,
      });
      rawScore += threatWeight;
    }

    // Hops to bad actor
    if (features.hopsToBadActor < 99) {
      const hopWeight = this.weights.hopsToBadActor[
        features.hopsToBadActor as keyof typeof this.weights.hopsToBadActor
      ] || Math.max(0, 70 - features.hopsToBadActor * 10);
      factors.push({
        name: 'Proximity to Bad Actor',
        weight: hopWeight,
        value: features.hopsToBadActor,
        contribution: hopWeight,
        description: `Connected to known bad actor within ${features.hopsToBadActor} hop(s)`,
      });
      rawScore += hopWeight;
    }

    // Cluster risk
    const clusterWeight = this.weights.clusterRisk[
      features.clusterRiskLevel as keyof typeof this.weights.clusterRisk
    ] || 0;
    if (clusterWeight > 0) {
      factors.push({
        name: 'Cluster Risk',
        weight: clusterWeight,
        value: features.clusterSize,
        contribution: clusterWeight,
        description: `Part of ${features.clusterRiskLevel} risk cluster (${features.clusterSize} addresses)`,
      });
      rawScore += clusterWeight;
    }

    // High transaction frequency
    if (features.txFrequencyPerDay > this.weights.txFrequency.threshold) {
      const w = this.weights.txFrequency.weight;
      factors.push({
        name: 'High TX Frequency',
        weight: w,
        value: features.txFrequencyPerDay,
        contribution: w,
        description: `${features.txFrequencyPerDay.toFixed(1)} transactions/day`,
      });
      rawScore += w;
    }

    // Fan-out pattern
    if (features.uniqueRecipients > this.weights.fanOut.threshold) {
      const w = this.weights.fanOut.weight;
      factors.push({
        name: 'Fan-out Pattern',
        weight: w,
        value: features.uniqueRecipients,
        contribution: w,
        description: `Sent to ${features.uniqueRecipients} unique recipients`,
      });
      rawScore += w;
    }

    // Fan-in pattern
    if (features.uniqueSenders > this.weights.fanIn.threshold) {
      const w = this.weights.fanIn.weight;
      factors.push({
        name: 'Fan-in Pattern',
        weight: w,
        value: features.uniqueSenders,
        contribution: w,
        description: `Received from ${features.uniqueSenders} unique senders`,
      });
      rawScore += w;
    }

    // Round number transactions (smurfing indicator)
    if (features.roundNumberRatio > this.weights.roundNumbers.threshold) {
      const w = this.weights.roundNumbers.weight;
      factors.push({
        name: 'Round Number Transactions',
        weight: w,
        value: features.roundNumberRatio,
        contribution: w,
        description: `${(features.roundNumberRatio * 100).toFixed(0)}% of transactions use round BTC amounts`,
      });
      rawScore += w;
    }

    // Mempool activity
    if (features.mempoolHits > this.weights.mempoolHits.threshold) {
      const w = this.weights.mempoolHits.weight;
      factors.push({
        name: 'Mempool Activity',
        weight: w,
        value: features.mempoolHits,
        contribution: w,
        description: `Seen ${features.mempoolHits} times in monitored mempool`,
      });
      rawScore += w;
    }

    // Known entity discounts
    if (features.isExchange) {
      rawScore += this.weights.isExchange;
      factors.push({
        name: 'Known Exchange',
        weight: this.weights.isExchange,
        value: 1,
        contribution: this.weights.isExchange,
        description: 'Address belongs to a known regulated exchange',
      });
    }

    if (features.isMiningPool) {
      rawScore += this.weights.isMiningPool;
      factors.push({
        name: 'Mining Pool',
        weight: this.weights.isMiningPool,
        value: 1,
        contribution: this.weights.isMiningPool,
        description: 'Address belongs to a known mining pool',
      });
    }

    // Normalize to 0-100
    const finalScore = Math.max(0, Math.min(100, rawScore));
    const level = this.getLevel(finalScore);
    const confidence = Math.min(95, 50 + factors.length * 8);

    const topFactor = factors.sort((a, b) => b.contribution - a.contribution)[0];
    const explanation = factors.length === 0
      ? 'No risk indicators found. Address appears clean.'
      : `Primary risk factor: ${topFactor?.name}. ${factors.length} indicator(s) detected.`;

    return {
      address: features.address,
      score: finalScore,
      level,
      confidence,
      factors,
      explanation,
    };
  }

  private getLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }
}
