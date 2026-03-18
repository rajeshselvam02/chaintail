import { Pool } from 'pg';

export interface AddressFeatures {
  address: string;
  txCount: number;
  totalReceived: number;
  totalSent: number;
  uniqueSenders: number;
  uniqueRecipients: number;
  avgTxValue: number;
  maxTxValue: number;
  minTxValue: number;
  txFrequencyPerDay: number;
  roundNumberRatio: number;
  hasThreatIntel: boolean;
  threatCategory: string | null;
  hopsToBadActor: number;
  clusterSize: number;
  clusterRiskLevel: string;
  isExchange: boolean;
  isMiningPool: boolean;
  mempoolHits: number;
}

export class FeatureExtractor {
  constructor(private db: Pool) {}

  async extract(address: string): Promise<AddressFeatures> {
    const [txStats, threatInfo, clusterInfo, entityInfo, mempoolInfo] =
      await Promise.all([
        this.getTxStats(address),
        this.getThreatInfo(address),
        this.getClusterInfo(address),
        this.getEntityInfo(address),
        this.getMempoolInfo(address),
      ]);

    const hopsToBadActor = await this.getHopsToBadActor(address);

    return {
      address,
      txCount: txStats.txCount,
      totalReceived: txStats.totalReceived,
      totalSent: txStats.totalSent,
      uniqueSenders: txStats.uniqueSenders,
      uniqueRecipients: txStats.uniqueRecipients,
      avgTxValue: txStats.avgTxValue,
      maxTxValue: txStats.maxTxValue,
      minTxValue: txStats.minTxValue,
      txFrequencyPerDay: txStats.txFrequencyPerDay,
      roundNumberRatio: txStats.roundNumberRatio,
      hasThreatIntel: threatInfo.found,
      threatCategory: threatInfo.category,
      hopsToBadActor,
      clusterSize: clusterInfo.size,
      clusterRiskLevel: clusterInfo.riskLevel,
      isExchange: entityInfo.isExchange,
      isMiningPool: entityInfo.isMiningPool,
      mempoolHits: mempoolInfo.hits,
    };
  }

  private async getTxStats(address: string): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(DISTINCT t.txid) AS tx_count,
        COALESCE(SUM(o.value_satoshi) FILTER (WHERE o.to_address = $1), 0) AS total_received,
        COALESCE(SUM(i.value_satoshi) FILTER (WHERE i.from_address = $1), 0) AS total_sent,
        COUNT(DISTINCT i.from_address) FILTER (WHERE i.from_address != $1) AS unique_senders,
        COUNT(DISTINCT o.to_address) FILTER (WHERE o.to_address != $1) AS unique_recipients,
        COALESCE(AVG(o.value_satoshi), 0) AS avg_tx_value,
        COALESCE(MAX(o.value_satoshi), 0) AS max_tx_value,
        COALESCE(MIN(o.value_satoshi), 0) AS min_tx_value,
        COUNT(DISTINCT t.txid)::float /
          NULLIF(EXTRACT(EPOCH FROM (MAX(t.timestamp) - MIN(t.timestamp))) / 86400, 0) AS tx_per_day,
        COUNT(*) FILTER (WHERE o.value_satoshi % 100000000 = 0)::float /
          NULLIF(COUNT(*), 0) AS round_number_ratio
      FROM transactions t
      LEFT JOIN tx_inputs i ON i.txid = t.txid
      LEFT JOIN tx_outputs o ON o.txid = t.txid
      WHERE i.from_address = $1 OR o.to_address = $1
    `, [address]);

    const row = rows[0] || {};
    return {
      txCount: parseInt(row.tx_count) || 0,
      totalReceived: parseInt(row.total_received) || 0,
      totalSent: parseInt(row.total_sent) || 0,
      uniqueSenders: parseInt(row.unique_senders) || 0,
      uniqueRecipients: parseInt(row.unique_recipients) || 0,
      avgTxValue: parseFloat(row.avg_tx_value) || 0,
      maxTxValue: parseInt(row.max_tx_value) || 0,
      minTxValue: parseInt(row.min_tx_value) || 0,
      txFrequencyPerDay: parseFloat(row.tx_per_day) || 0,
      roundNumberRatio: parseFloat(row.round_number_ratio) || 0,
    };
  }

  private async getThreatInfo(address: string): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT category FROM threat_intel WHERE address = $1 LIMIT 1
    `, [address]);
    return { found: rows.length > 0, category: rows[0]?.category || null };
  }

  private async getClusterInfo(address: string): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT
        COUNT(a2.id) AS cluster_size,
        c.risk_level
      FROM addresses a
      LEFT JOIN clusters c ON c.id = a.cluster_id
      LEFT JOIN addresses a2 ON a2.cluster_id = a.cluster_id
      WHERE a.address = $1
      GROUP BY c.risk_level
    `, [address]);
    return {
      size: parseInt(rows[0]?.cluster_size) || 1,
      riskLevel: rows[0]?.risk_level || 'unknown',
    };
  }

  private async getEntityInfo(address: string): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT e.category FROM entity_addresses ea
      JOIN entities e ON e.id = ea.entity_id
      WHERE ea.address = $1 LIMIT 1
    `, [address]);
    return {
      isExchange: rows[0]?.category === 'exchange',
      isMiningPool: rows[0]?.category === 'mining_pool',
    };
  }

  private async getMempoolInfo(address: string): Promise<any> {
    const { rows } = await this.db.query(`
      SELECT COUNT(*) AS hits FROM alerts
      WHERE address = $1 AND reason LIKE '%mempool%'
    `, [address]);
    return { hits: parseInt(rows[0]?.hits) || 0 };
  }

  private async getHopsToBadActor(address: string): Promise<number> {
    const { rows } = await this.db.query(`
      WITH RECURSIVE graph AS (
        SELECT i.from_address, 1 AS hop
        FROM tx_inputs i
        JOIN transactions t ON t.txid = i.txid
        JOIN tx_outputs o ON o.txid = t.txid AND o.to_address = $1
        WHERE i.from_address IS NOT NULL

        UNION ALL

        SELECT i.from_address, g.hop + 1
        FROM graph g
        JOIN tx_inputs i ON i.txid = (
          SELECT txid FROM tx_outputs WHERE to_address = g.from_address LIMIT 1
        )
        WHERE g.hop < 5
          AND i.from_address IS NOT NULL
      )
      SELECT MIN(g.hop) AS min_hops
      FROM graph g
      JOIN threat_intel t ON t.address = g.from_address
    `, [address]);
    return parseInt(rows[0]?.min_hops) || 99;
  }
}
