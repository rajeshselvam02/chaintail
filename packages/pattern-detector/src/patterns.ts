import { Pool } from 'pg';

export type PatternType = 'layering' | 'smurfing' | 'peeling_chain' | 'fan_out' | 'fan_in' | 'rapid_movement';

export interface PatternMatch {
  type: PatternType;
  address: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  evidence: Record<string, any>;
  detectedAt: Date;
}

export class PatternDetector {
  constructor(private db: Pool) {}

  async analyzeAddress(address: string): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    const [fanOut, fanIn, peeling] = await Promise.all([
      this.detectFanOut(address),
      this.detectFanIn(address),
      this.detectPeelingChain(address),
    ]);
    if (fanOut) matches.push(fanOut);
    if (fanIn) matches.push(fanIn);
    if (peeling) matches.push(peeling);
    for (const match of matches) await this.saveAlert(match);
    return matches;
  }

  private async detectFanOut(address: string): Promise<PatternMatch | null> {
    const { rows } = await this.db.query(`
      SELECT COUNT(DISTINCT o.to_address) AS recipient_count,
             COUNT(DISTINCT t.txid) AS tx_count
      FROM tx_outputs o
      JOIN transactions t ON t.txid = o.txid
      JOIN tx_inputs i ON i.txid = t.txid AND i.from_address = $1
      WHERE o.to_address != $1
    `, [address]);
    const row = rows[0];
    if (!row) return null;
    const recipientCount = parseInt(row.recipient_count);
    const txCount = parseInt(row.tx_count);
    if (recipientCount >= 15 && txCount >= 5) {
      return {
        type: 'fan_out', address,
        severity: recipientCount >= 50 ? 'critical' : 'high',
        confidence: Math.min(85, 40 + recipientCount),
        description: `Sent to ${recipientCount} unique recipients in ${txCount} transactions`,
        evidence: { recipientCount, txCount },
        detectedAt: new Date(),
      };
    }
    return null;
  }

  private async detectFanIn(address: string): Promise<PatternMatch | null> {
    const { rows } = await this.db.query(`
      SELECT COUNT(DISTINCT i.from_address) AS sender_count,
             COUNT(DISTINCT t.txid) AS tx_count
      FROM tx_inputs i
      JOIN transactions t ON t.txid = i.txid
      JOIN tx_outputs o ON o.txid = t.txid AND o.to_address = $1
      WHERE i.from_address != $1
    `, [address]);
    const row = rows[0];
    if (!row) return null;
    const senderCount = parseInt(row.sender_count);
    const txCount = parseInt(row.tx_count);
    if (senderCount >= 15 && txCount >= 5) {
      return {
        type: 'fan_in', address,
        severity: senderCount >= 50 ? 'critical' : 'high',
        confidence: Math.min(80, 35 + senderCount),
        description: `Received from ${senderCount} unique senders in ${txCount} transactions`,
        evidence: { senderCount, txCount },
        detectedAt: new Date(),
      };
    }
    return null;
  }

  private async detectPeelingChain(address: string): Promise<PatternMatch | null> {
    const { rows } = await this.db.query(`
      SELECT COUNT(*) AS peel_count
      FROM transactions t
      JOIN tx_inputs i ON i.txid = t.txid AND i.from_address = $1
      JOIN (
        SELECT txid FROM tx_outputs
        GROUP BY txid HAVING COUNT(*) = 2
      ) two_output ON two_output.txid = t.txid
    `, [address]);
    const row = rows[0];
    if (!row) return null;
    const peelCount = parseInt(row.peel_count);
    if (peelCount >= 5) {
      return {
        type: 'peeling_chain', address,
        severity: peelCount >= 15 ? 'high' : 'medium',
        confidence: Math.min(75, 30 + peelCount * 3),
        description: `${peelCount} transactions with exactly 2 outputs — consistent with peeling chain`,
        evidence: { peelCount },
        detectedAt: new Date(),
      };
    }
    return null;
  }

  private async saveAlert(match: PatternMatch): Promise<void> {
    await this.db.query(`
      INSERT INTO alerts (address, reason, severity, metadata)
      VALUES ($1, $2, $3, $4)
    `, [
      match.address,
      `Pattern: ${match.type} — ${match.description}`,
      match.severity,
      JSON.stringify({ pattern: match.type, confidence: match.confidence }),
    ]).catch(() => {});
  }
}
