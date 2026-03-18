import { Pool } from 'pg';
import { KNOWN_ENTITIES, KnownEntity } from './known-entities';

export interface ImportStats {
  entitiesImported: number;
  addressesImported: number;
  skipped: number;
}

export class EntityImporter {
  constructor(private db: Pool) {}

  async importAll(): Promise<ImportStats> {
    let entitiesImported = 0;
    let addressesImported = 0;
    let skipped = 0;

    console.log(`📥 Importing ${KNOWN_ENTITIES.length} known entities...`);

    for (const entity of KNOWN_ENTITIES) {
      try {
        const entityId = await this.upsertEntity(entity);
        entitiesImported++;

        for (const addr of entity.addresses) {
          try {
            await this.db.query(`
              INSERT INTO entity_addresses
                (entity_id, address, label, address_type, is_verified, source)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (address) DO UPDATE SET
                label = EXCLUDED.label,
                is_verified = EXCLUDED.is_verified
            `, [entityId, addr.address, addr.label, addr.type, addr.verified || false, 'chaintail-builtin']);
            addressesImported++;
          } catch {
            skipped++;
          }
        }

        // Import tags
        if (entity.tags) {
          for (const tag of entity.tags) {
            await this.db.query(`
              INSERT INTO entity_tags (entity_id, tag)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [entityId, tag]).catch(() => {});
          }
        }

        console.log(`   ✅ ${entity.name} (${entity.addresses.length} addresses)`);
      } catch (err: any) {
        console.warn(`   ⚠️  ${entity.name}: ${err.message}`);
        skipped++;
      }
    }

    return { entitiesImported, addressesImported, skipped };
  }

  private async upsertEntity(entity: KnownEntity): Promise<string> {
    const { rows } = await this.db.query(`
      INSERT INTO entities
        (name, category, subcategory, url, description, country,
         is_regulated, is_sanctioned, risk_level)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (name) DO UPDATE SET
        category = EXCLUDED.category,
        url = EXCLUDED.url,
        updated_at = NOW()
      RETURNING id
    `, [
      entity.name,
      entity.category,
      entity.subcategory || null,
      entity.url || null,
      entity.description || null,
      entity.country || null,
      entity.isRegulated || false,
      entity.isSanctioned || false,
      entity.riskLevel || 'low',
    ]);
    return rows[0].id;
  }
}
