import { Pool } from 'pg';
export interface EntityLabel {
    entityName: string;
    entityCategory: string;
    entitySubcategory?: string;
    addressLabel: string;
    addressType: string;
    isVerified: boolean;
    riskLevel: string;
    isRegulated: boolean;
    isSanctioned: boolean;
    country?: string;
    url?: string;
    tags?: string[];
}
export declare class EntityLookup {
    private db;
    constructor(db: Pool);
    lookupAddress(address: string): Promise<EntityLabel | null>;
    lookupAddresses(addresses: string[]): Promise<Map<string, EntityLabel>>;
    searchEntities(query: string): Promise<any[]>;
    getEntityByName(name: string): Promise<any>;
    getStats(): Promise<any>;
}
