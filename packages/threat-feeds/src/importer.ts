import axios from 'axios';
import { Pool } from 'pg';
import { KNOWN_BAD_ACTORS, FEED_SOURCES, FeedSource } from './sources';

const BTC_ADDRESS_REGEX = /\b([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{6,87})\b/g;

export interface ImportResult {
  source: string;
  imported: number;
  skipped: number;
  errors: number;
}

export class FeedImporter {
  constructor(private db: Pool) {}

  async importAll(): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    // Import hardcoded known bad actors first
    console.log('📥 Importing known bad actors...');
    const badActorResult = await this.importKnownBadActors();
    results.push(badActorResult);

    // Import from live feeds
    for (const source of FEED_SOURCES) {
      console.log(`📥 Fetching feed: ${source.name}...`);
      try {
        const result = await this.importFeed(source);
        results.push(result);
      } catch (err: any) {
        console.warn(`   ⚠️  Failed: ${err.message}`);
        results.push({ source: source.name, imported: 0, skipped: 0, errors: 1 });
      }
    }

    return results;
  }

  async importKnownBadActors(): Promise<ImportResult> {
    let imported = 0;
    let skipped = 0;

    for (const actor of KNOWN_BAD_ACTORS) {
      try {
        const { rowCount } = await this.db.query(`
          INSERT INTO threat_intel (address, label, category, source, confidence)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [actor.address, actor.label, actor.category, 'chaintail-builtin', actor.confidence]);

        if (rowCount && rowCount > 0) imported++;
        else skipped++;
      } catch {
        skipped++;
      }
    }

    console.log(`   ✅ Known bad actors: ${imported} imported, ${skipped} skipped`);
    return { source: 'chaintail-builtin', imported, skipped, errors: 0 };
  }

  async importFeed(source: FeedSource): Promise<ImportResult> {
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    const { data } = await axios.get(source.url, {
      timeout: 15000,
      responseType: 'text',
    });

    const addresses = this.extractAddresses(data, source);

    for (const address of addresses) {
      try {
        const { rowCount } = await this.db.query(`
          INSERT INTO threat_intel (address, label, category, source, confidence)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [address, source.name, source.category, source.name, source.confidence]);

        if (rowCount && rowCount > 0) imported++;
        else skipped++;
      } catch {
        errors++;
      }
    }

    console.log(`   ✅ ${source.name}: ${imported} imported, ${skipped} skipped, ${errors} errors`);
    return { source: source.name, imported, skipped, errors };
  }

  private extractAddresses(data: string, source: FeedSource): string[] {
    const addresses: string[] = [];
    const matches = data.match(BTC_ADDRESS_REGEX);
    if (matches) addresses.push(...matches);
    return [...new Set(addresses)]; // dedupe
  }
}
