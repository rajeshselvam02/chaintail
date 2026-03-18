/**
 * Union-Find (Disjoint Set Union) data structure
 * Used to efficiently group addresses into clusters
 */
export declare class UnionFind {
    private parent;
    private rank;
    find(x: string): string;
    union(x: string, y: string): void;
    getClusters(): Map<string, string[]>;
    getClusterOf(address: string): string;
    size(): number;
}
