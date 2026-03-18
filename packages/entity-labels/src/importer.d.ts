import { Pool } from 'pg';
export interface ImportStats {
    entitiesImported: number;
    addressesImported: number;
    skipped: number;
}
export declare class EntityImporter {
    private db;
    constructor(db: Pool);
    importAll(): Promise<ImportStats>;
    private upsertEntity;
}
