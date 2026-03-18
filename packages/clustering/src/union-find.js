"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnionFind = void 0;
/**
 * Union-Find (Disjoint Set Union) data structure
 * Used to efficiently group addresses into clusters
 */
class UnionFind {
    constructor() {
        this.parent = new Map();
        this.rank = new Map();
    }
    find(x) {
        if (!this.parent.has(x)) {
            this.parent.set(x, x);
            this.rank.set(x, 0);
        }
        if (this.parent.get(x) !== x) {
            // Path compression
            this.parent.set(x, this.find(this.parent.get(x)));
        }
        return this.parent.get(x);
    }
    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX === rootY)
            return;
        // Union by rank
        const rankX = this.rank.get(rootX) ?? 0;
        const rankY = this.rank.get(rootY) ?? 0;
        if (rankX < rankY) {
            this.parent.set(rootX, rootY);
        }
        else if (rankX > rankY) {
            this.parent.set(rootY, rootX);
        }
        else {
            this.parent.set(rootY, rootX);
            this.rank.set(rootX, rankX + 1);
        }
    }
    getClusters() {
        const clusters = new Map();
        for (const node of this.parent.keys()) {
            const root = this.find(node);
            if (!clusters.has(root))
                clusters.set(root, []);
            clusters.get(root).push(node);
        }
        return clusters;
    }
    getClusterOf(address) {
        return this.find(address);
    }
    size() {
        return this.parent.size;
    }
}
exports.UnionFind = UnionFind;
//# sourceMappingURL=union-find.js.map