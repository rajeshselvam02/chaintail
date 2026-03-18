"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityLookup = void 0;
class EntityLookup {
    constructor(db) {
        this.db = db;
    }
    async lookupAddress(address) {
        const { rows } = await this.db.query(`
      SELECT
        e.name AS entity_name,
        e.category AS entity_category,
        e.subcategory AS entity_subcategory,
        e.risk_level,
        e.is_regulated,
        e.is_sanctioned,
        e.country,
        e.url,
        ea.label AS address_label,
        ea.address_type,
        ea.is_verified,
        COALESCE(
          (SELECT array_agg(tag) FROM entity_tags WHERE entity_id = e.id),
          '{}'
        ) AS tags
      FROM entity_addresses ea
      JOIN entities e ON e.id = ea.entity_id
      WHERE ea.address = $1
    `, [address]);
        if (rows.length === 0)
            return null;
        const row = rows[0];
        return {
            entityName: row.entity_name,
            entityCategory: row.entity_category,
            entitySubcategory: row.entity_subcategory,
            addressLabel: row.address_label,
            addressType: row.address_type,
            isVerified: row.is_verified,
            riskLevel: row.risk_level,
            isRegulated: row.is_regulated,
            isSanctioned: row.is_sanctioned,
            country: row.country,
            url: row.url,
            tags: row.tags,
        };
    }
    async lookupAddresses(addresses) {
        if (addresses.length === 0)
            return new Map();
        const { rows } = await this.db.query(`
      SELECT
        ea.address,
        e.name AS entity_name,
        e.category AS entity_category,
        e.subcategory AS entity_subcategory,
        e.risk_level,
        e.is_regulated,
        e.is_sanctioned,
        e.country,
        e.url,
        ea.label AS address_label,
        ea.address_type,
        ea.is_verified
      FROM entity_addresses ea
      JOIN entities e ON e.id = ea.entity_id
      WHERE ea.address = ANY($1::text[])
    `, [addresses]);
        const result = new Map();
        for (const row of rows) {
            result.set(row.address, {
                entityName: row.entity_name,
                entityCategory: row.entity_category,
                entitySubcategory: row.entity_subcategory,
                addressLabel: row.address_label,
                addressType: row.address_type,
                isVerified: row.is_verified,
                riskLevel: row.risk_level,
                isRegulated: row.is_regulated,
                isSanctioned: row.is_sanctioned,
                country: row.country,
                url: row.url,
            });
        }
        return result;
    }
    async searchEntities(query) {
        const { rows } = await this.db.query(`
      SELECT e.*, COUNT(ea.id) AS address_count
      FROM entities e
      LEFT JOIN entity_addresses ea ON ea.entity_id = e.id
      WHERE e.name ILIKE $1 OR e.description ILIKE $1
      GROUP BY e.id
      ORDER BY e.name
      LIMIT 20
    `, [`%${query}%`]);
        return rows;
    }
    async getEntityByName(name) {
        const { rows } = await this.db.query(`
      SELECT
        e.*,
        json_agg(json_build_object(
          'address', ea.address,
          'label', ea.label,
          'type', ea.address_type,
          'verified', ea.is_verified
        )) AS addresses
      FROM entities e
      LEFT JOIN entity_addresses ea ON ea.entity_id = e.id
      WHERE e.name ILIKE $1
      GROUP BY e.id
      LIMIT 1
    `, [name]);
        return rows[0] || null;
    }
    async getStats() {
        const { rows } = await this.db.query(`
      SELECT
        COUNT(DISTINCT e.id) AS total_entities,
        COUNT(ea.id) AS total_addresses,
        COUNT(DISTINCT e.category) AS total_categories,
        COUNT(DISTINCT e.id) FILTER (WHERE e.is_regulated) AS regulated,
        COUNT(DISTINCT e.id) FILTER (WHERE e.is_sanctioned) AS sanctioned
      FROM entities e
      LEFT JOIN entity_addresses ea ON ea.entity_id = e.id
    `);
        return rows[0];
    }
}
exports.EntityLookup = EntityLookup;
//# sourceMappingURL=lookup.js.map