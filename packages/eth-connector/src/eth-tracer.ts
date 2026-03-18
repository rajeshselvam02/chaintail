import { Pool } from 'pg';
import { EtherscanClient, EthTransaction } from './etherscan-client';

export interface EthTraceResult {
  targetAddress: string;
  chain: string;
  hops: number;
  nodes: EthNode[];
  totalValueWei: string;
  totalValueEth: string;
  flaggedAddresses: EthNode[];
  riskScore: number;
}

export interface EthNode {
  address: string;
  hop: number;
  valueWei: string;
  txhash: string;
  direction: 'in' | 'out';
  threatCategory?: string;
  threatLabel?: string;
}

export class EthTracer {
  private client: EtherscanClient;

  constructor(
    private db: Pool,
    apiKey?: string
  ) {
    this.client = new EtherscanClient(apiKey || process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken');
  }

  async trace(address: string, hops = 3): Promise<EthTraceResult> {
    const nodes: EthNode[] = [];
    const visited = new Set<string>();
    const queue = [{ address: address.toLowerCase(), hop: 1 }];

    // Ingest initial address transactions
    await this.ingestAddress(address);

    while (queue.length > 0 && nodes.length < 200) {
      const { address: addr, hop } = queue.shift()!;
      if (visited.has(addr) || hop > hops) continue;
      visited.add(addr);

      const txs = await this.getStoredTransactions(addr);

      for (const tx of txs.slice(0, 20)) {
        const isOutgoing = tx.from_address?.toLowerCase() === addr;
        const connected = isOutgoing ? tx.to_address : tx.from_address;
        if (!connected || connected === addr) continue;

        nodes.push({
          address: connected,
          hop,
          valueWei: tx.value_wei || '0',
          txhash: tx.txhash,
          direction: isOutgoing ? 'out' : 'in',
        });

        if (hop + 1 <= hops) {
          queue.push({ address: connected, hop: hop + 1 });
        }
      }
    }

    // Check threat intel
    const allAddresses = [...new Set(nodes.map(n => n.address))];
    const flagged = await this.checkThreatIntel(allAddresses, nodes);

    // Calculate risk
    const riskScore = flagged.length > 0
      ? Math.min(100, flagged.reduce((sum, f) => sum + 40, 0))
      : 0;

    const totalWei = nodes.reduce((sum, n) => sum + BigInt(n.valueWei || '0'), BigInt(0));

    return {
      targetAddress: address,
      chain: 'mainnet',
      hops,
      nodes,
      totalValueWei: totalWei.toString(),
      totalValueEth: (Number(totalWei) / 1e18).toFixed(6),
      flaggedAddresses: flagged,
      riskScore,
    };
  }

  private async ingestAddress(address: string): Promise<void> {
    try {
      const txs = await this.client.getTransactions(address, 20);
      for (const tx of txs) {
        await this.db.query(`
          INSERT INTO eth_transactions
            (txhash, block_number, timestamp, from_address, to_address,
             value_wei, gas_used, gas_price, is_error)
          VALUES ($1,$2,to_timestamp($3),$4,$5,$6,$7,$8,$9)
          ON CONFLICT (txhash) DO NOTHING
        `, [tx.txhash, tx.blockNumber, tx.timestamp, tx.from, tx.to,
            tx.value, tx.gasUsed, tx.gasPrice, tx.isError]);
      }
    } catch (err: any) {
      console.warn(`ETH ingest failed: ${err.message}`);
    }
  }

  private async getStoredTransactions(address: string): Promise<any[]> {
    const { rows } = await this.db.query(`
      SELECT * FROM eth_transactions
      WHERE from_address = $1 OR to_address = $1
      ORDER BY timestamp DESC LIMIT 20
    `, [address.toLowerCase()]);
    return rows;
  }

  private async checkThreatIntel(addresses: string[], nodes: EthNode[]): Promise<EthNode[]> {
    if (addresses.length === 0) return [];
    const { rows } = await this.db.query(`
      SELECT address, label, category FROM threat_intel
      WHERE LOWER(address) = ANY($1::text[])
    `, [addresses.map(a => a.toLowerCase())]);

    const threatMap = new Map(rows.map((r: any) => [r.address.toLowerCase(), r]));
    const flagged: EthNode[] = [];

    for (const node of nodes) {
      const threat = threatMap.get(node.address.toLowerCase());
      if (threat) {
        node.threatCategory = threat.category;
        node.threatLabel = threat.label;
        flagged.push(node);
      }
    }
    return flagged;
  }
}
