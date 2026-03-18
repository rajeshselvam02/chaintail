import axios from 'axios';
import { Pool } from 'pg';

/**
 * OFAC (Office of Foreign Assets Control) Sanctions Sync
 * Pulls the SDN (Specially Designated Nationals) list from US Treasury
 * and imports all Bitcoin addresses into threat_intel
 */

const OFAC_SDN_URL = 'https://www.treasury.gov/ofac/downloads/sdn.xml';
const OFAC_DIGITAL_CURRENCY_URL = 'https://www.treasury.gov/ofac/downloads/digital_currency_addresses.xml';
const BTC_ADDRESS_REGEX = /\b([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{6,87})\b/g;

export interface OFACEntry {
  address: string;
  name: string;
  program: string;
  type: string;
}

export class OFACSync {
  constructor(private db: Pool) {}

  async sync(): Promise<{ imported: number; skipped: number }> {
    console.log('🏛️  Syncing OFAC sanctions list...');
    let imported = 0;
    let skipped = 0;

    try {
      // Try digital currency specific list first
      const entries = await this.fetchDigitalCurrencyList();

      for (const entry of entries) {
        try {
          const { rowCount } = await this.db.query(`
            INSERT INTO threat_intel (address, label, category, source, confidence)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
          `, [
            entry.address,
            `OFAC SDN: ${entry.name}`,
            'sanctioned',
            'ofac-treasury',
            100,
          ]);

          if (rowCount && rowCount > 0) {
            imported++;
            // Also update addresses table risk score
            await this.db.query(`
              INSERT INTO addresses (address, risk_score, labels)
              VALUES ($1, 100, ARRAY['ofac_sanctioned', $2])
              ON CONFLICT (address) DO UPDATE SET
                risk_score = 100,
                labels = array_append(addresses.labels, 'ofac_sanctioned')
            `, [entry.address, `ofac:${entry.name.slice(0, 50)}`]);
          } else {
            skipped++;
          }
        } catch {
          skipped++;
        }
      }

      console.log(`   ✅ OFAC sync complete: ${imported} imported, ${skipped} skipped`);
    } catch (err: any) {
      console.warn(`   ⚠️  OFAC fetch failed: ${err.message}`);
      console.log('   ℹ️  Using fallback hardcoded OFAC entries...');
      const result = await this.importFallbackEntries();
      imported = result.imported;
      skipped = result.skipped;
    }

    return { imported, skipped };
  }

  private async fetchDigitalCurrencyList(): Promise<OFACEntry[]> {
    const { data } = await axios.get(OFAC_DIGITAL_CURRENCY_URL, {
      timeout: 30000,
      headers: { 'User-Agent': 'ChainTrail/0.1.0 (blockchain forensics research)' },
    });

    const entries: OFACEntry[] = [];
    const btcMatches = data.match(BTC_ADDRESS_REGEX) || [];

    // Extract names from XML context around each address
    for (const address of btcMatches) {
      const idx = data.indexOf(address);
      const context = data.substring(Math.max(0, idx - 500), idx);
      const nameMatch = context.match(/<lastName>([^<]+)<\/lastName>/);
      const progMatch = context.match(/<program>([^<]+)<\/program>/);

      entries.push({
        address,
        name: nameMatch ? nameMatch[1] : 'OFAC SDN Entry',
        program: progMatch ? progMatch[1] : 'UNKNOWN',
        type: 'Individual/Entity',
      });
    }

    return entries;
  }

  private async importFallbackEntries(): Promise<{ imported: number; skipped: number }> {
    // High-confidence OFAC sanctioned addresses from public records
    const OFAC_KNOWN = [
      // Lazarus Group / DPRK
      { address: '1FfmbHfnpaZjKFvyi1okTjJJusN455paPH', name: 'Lazarus Group DPRK', program: 'DPRK' },
      { address: '1KUUJPkyDhamZXgpsyXqNGc3x1QPXtdhgz', name: 'Lazarus Group DPRK', program: 'DPRK' },
      { address: 'bc1qzu6e3g2kz2jzeqqfexe9xe5q4k8enppky2tm89', name: 'Lazarus Group DPRK', program: 'DPRK' },
      // Hydra Market
      { address: '1AHDhxCFRfcPvBiCcJBhWWbDMJuNHBNHE2', name: 'Hydra Market', program: 'TCO' },
      // Garantex Exchange (sanctioned Russian exchange)
      { address: '3BGxrX3doVKnMkgKDkr9HJGNS5RhMfaX4D', name: 'Garantex Exchange', program: 'RUSSIA' },
      { address: '1Da4KFPYKi7HZvMbEm4hJYuHq7rWNfxBR5', name: 'Garantex Exchange', program: 'RUSSIA' },
      // Suex (sanctioned OTC broker)
      { address: '1L4ncif9hh9TnkDMTQUFDNLEH6MQeD1JGN', name: 'Suex OTC', program: 'RUSSIA' },
      // Tornado Cash
      { address: '0x722122dF12D4e14e13Ac3b6895a86e84145b6967', name: 'Tornado Cash', program: 'CYBER' },
      // Chatex
      { address: '1GRd1EiCsYBxBrJnbvwTosJFpfMRiNrHJu', name: 'Chatex', program: 'RUSSIA' },
    ];

    let imported = 0;
    let skipped = 0;

    for (const entry of OFAC_KNOWN) {
      try {
        const { rowCount } = await this.db.query(`
          INSERT INTO threat_intel (address, label, category, source, confidence)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [entry.address, `OFAC SDN: ${entry.name} (${entry.program})`, 'sanctioned', 'ofac-fallback', 100]);

        if (rowCount && rowCount > 0) imported++;
        else skipped++;
      } catch {
        skipped++;
      }
    }

    return { imported, skipped };
  }
}
