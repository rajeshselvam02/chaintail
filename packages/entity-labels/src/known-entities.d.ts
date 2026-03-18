export interface KnownEntity {
    name: string;
    category: string;
    subcategory?: string;
    url?: string;
    description?: string;
    country?: string;
    isRegulated?: boolean;
    isSanctioned?: boolean;
    riskLevel?: string;
    tags?: string[];
    addresses: {
        address: string;
        label: string;
        type: string;
        verified?: boolean;
    }[];
}
export declare const KNOWN_ENTITIES: KnownEntity[];
