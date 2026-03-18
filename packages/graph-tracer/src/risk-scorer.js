"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskScorer = void 0;
class RiskScorer {
    score(address, factors) {
        const totalScore = Math.min(100, factors.reduce((sum, f) => sum + f.score, 0));
        return {
            address,
            totalScore,
            level: this.getLevel(totalScore),
            factors,
        };
    }
    factorFromThreatIntel(category, confidence) {
        const baseScores = {
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
    factorFromHopDistance(hops, sourceRisk) {
        // Risk decays with distance
        const decayedScore = Math.round(sourceRisk * Math.pow(0.6, hops - 1));
        return {
            reason: `Connected to high-risk address within ${hops} hop(s)`,
            score: decayedScore,
            severity: this.getLevel(decayedScore),
        };
    }
    factorFromHighVolume(txCount) {
        if (txCount > 10000) {
            return { reason: 'Unusually high transaction volume', score: 20, severity: 'medium' };
        }
        return null;
    }
    getLevel(score) {
        if (score >= 80)
            return 'critical';
        if (score >= 60)
            return 'high';
        if (score >= 30)
            return 'medium';
        return 'low';
    }
}
exports.RiskScorer = RiskScorer;
//# sourceMappingURL=risk-scorer.js.map