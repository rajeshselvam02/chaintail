import { Pool } from 'pg';
import { UnionFind } from './union-find';

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

export class ClusteringEngine {
  constructor(private db: Pool) {}

  async clusterAll(): Promise<ClusterStats> {
    const start = Date.now();
    console.log('🔍 Loading transactions for clustering...');

    const { rows: txRows } = await this.db.query(`
      SELECT txid, array_agg(DISTINCT from_address) AS input_addresses
      FROM tx_inputs
      WHERE from_address IS NOT NULL
      GROUP BY txid
      HAVING COUNT(DISTINCT from_address) > 1
    `);

    console.log(`   Found ${txRows.length} multi-input transactions`);

    const uf = new UnionFind();

    for (const row of txRows) {
      const addresses: string[] = row.input_addresses.filter(Boolean);
      if (addresses.length < 2) continue;
      for (let i = 1; i < addresses.length; i++) {
        uf.union(addresses[0], addresses[i]);
      }
    }

    // Also register all known addresses as singletons
    const { rows: allAddrs } = await this.db.query(`
      SELECT DISTINCT from_address AS address FROM tx_inputs WHERE from_address IS NOT NULL
      UNION
      SELECT DISTINCT to_address FROM tx_outputs WHERE to_address IS NOT NULL
    `);
    for (const row of allAddrs) {
      uf.find(row.address); // registers in union-find
    }

    const clusters = uf.getClusters();
    console.log(`   Formed ${clusters.size} clusters from ${uf.size()} addresses`);

    await this.persistClusters(clusters);
    const clustersWithThreat = await this.propagateRisk();

    const sizes = [...clusters.values()].map(c => c.length);
    return {
      totalAddresses: uf.size(),
      totalClusters: clusters.size,
      clustersWithThreat,
      largestClusterSize: Math.max(0, ...sizes),
      processingTimeMs: Date.now() - start,
    };
  }

  async getClusterForAddress(address: string): Promise<ClusterResult | null> {
    const { rows } = await this.db.query(`
      SELECT
        c.id,
        c.label,
        c.risk_level,
        array_agg(a.address) AS addresses,
        MAX(a.risk_score) AS max_risk_score
      FROM addresses a
      JOIN clusters c ON c.id = a.cluster_id
      WHERE a.cluster_id = (
        SELECT cluster_id FROM addresses WHERE address = $1
      )
      GROUP BY c.id, c.label, c.risk_level
    `, [address]);

    if (rows.length === 0) return null;

    const row = rows[0];
    const threatCategories = await this.getClusterThreatCategories(row.id);

    return {
      clusterId: row.id,
      addresses: row.addresses,
      size: row.addresses.length,
      riskLevel: row.risk_level,
      riskScore: parseInt(row.max_risk_score || '0'),
      hasThreatIntel: threatCategories.length > 0,
      threatCategories,
    };
  }

  private async persistClusters(clusters: Map<string, string[]>): Promise<void> {
    console.log('💾 Persisting clusters to DB...');
    let saved = 0;

    for (const [root, addresses] of clusters) {
      const label = `cluster_${root.slice(0, 16)}`;

      // Upsert cluster
      const { rows } = await this.db.query(`
        INSERT INTO clusters (label)
        VALUES ($1)
        ON CONFLICT (label) DO UPDATE SET label = EXCLUDED.label
        RETURNING id
      `, [label]);

      // Handle missing UNIQUE on label — fallback select
      let clusterId: string;
      if (rows.length > 0) {
        clusterId = rows[0].id;
      } else {
        const { rows: sel } = await this.db.query(
          `SELECT id FROM clusters WHERE label = $1 LIMIT 1`, [label]
        );
        if (sel.length === 0) continue;
        clusterId = sel[0].id;
      }

      for (const address of addresses) {
        await this.db.query(`
          INSERT INTO addresses (address, cluster_id)
          VALUES ($1, $2)
          ON CONFLICT (address) DO UPDATE SET cluster_id = $2
        `, [address, clusterId]);
      }

      saved++;
    }

    console.log(`   ✅ Saved ${saved} clusters`);
  }

  private async propagateRisk(): Promise<number> {
    const { rows } = await this.db.query(`
      SELECT DISTINCT a.cluster_id, t.category, t.confidence
      FROM addresses a
      JOIN threat_intel t ON t.address = a.address
      WHERE a.cluster_id IS NOT NULL
    `);

    let flaggedCount = 0;
    for (const row of rows) {
      const riskLevel =
        ['sanctioned', 'ransomware'].includes(row.category) ? 'critical' :
        ['darknet', 'mixer'].includes(row.category) ? 'high' :
        'medium';

      await this.db.query(`
        UPDATE addresses
        SET risk_score = GREATEST(risk_score, $1),
            labels = array_append(labels, $2)
        WHERE cluster_id = $3
      `, [row.confidence, `via_cluster:${row.category}`, row.cluster_id]);

      await this.db.query(`
        UPDATE clusters SET risk_level = $1 WHERE id = $2
      `, [riskLevel, row.cluster_id]);

      await this.db.query(`
        INSERT INTO alerts (reason, severity, metadata)
        VALUES ($1, $2, $3)
      `, [
        `Cluster contains ${row.category} address`,
        riskLevel,
        JSON.stringify({ clusterId: row.cluster_id, category: row.category }),
      ]);

      flaggedCount++;
    }

    if (flaggedCount > 0) {
      console.log(`   🚨 ${flaggedCount} clusters flagged via threat propagation`);
    }

    return flaggedCount;
  }

  private async getClusterThreatCategories(clusterId: string): Promise<string[]> {
    const { rows } = await this.db.query(`
      SELECT DISTINCT t.category
      FROM addresses a
      JOIN threat_intel t ON t.address = a.address
      WHERE a.cluster_id = $1
    `, [clusterId]);
    return rows.map((r: any) => r.category);
  }
}
