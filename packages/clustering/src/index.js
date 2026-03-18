"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnionFind = exports.ClusteringEngine = void 0;
const engine_1 = require("./engine");
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
var engine_2 = require("./engine");
Object.defineProperty(exports, "ClusteringEngine", { enumerable: true, get: function () { return engine_2.ClusteringEngine; } });
var union_find_1 = require("./union-find");
Object.defineProperty(exports, "UnionFind", { enumerable: true, get: function () { return union_find_1.UnionFind; } });
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
if (require.main === module) {
    const args = process.argv.slice(2);
    const addressIdx = args.indexOf('--address');
    const address = addressIdx !== -1 ? args[addressIdx + 1] : null;
    const db = new pg_1.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'chaintail',
        password: process.env.DB_PASSWORD || 'chaintail',
        database: process.env.DB_NAME || 'chaintail',
    });
    (async () => {
        const engine = new engine_1.ClusteringEngine(db);
        console.log(`\n${BOLD}╔══════════════════════════════════════════════╗${RESET}`);
        console.log(`${BOLD}║       ChainTrail Clustering Engine           ║${RESET}`);
        console.log(`${BOLD}╚══════════════════════════════════════════════╝${RESET}\n`);
        if (address) {
            // Lookup cluster for specific address
            console.log(`${CYAN}Looking up cluster for:${RESET} ${address}\n`);
            const cluster = await engine.getClusterForAddress(address);
            if (!cluster) {
                console.log(`ℹ️  No cluster found for ${address}`);
                console.log(`   Run clustering first: npm run cluster`);
            }
            else {
                console.log(`${BOLD}Cluster ID:${RESET}    ${cluster.clusterId}`);
                console.log(`${BOLD}Size:${RESET}          ${cluster.size} addresses`);
                console.log(`${BOLD}Risk Level:${RESET}    ${colorLevel(cluster.riskLevel)}`);
                console.log(`${BOLD}Risk Score:${RESET}    ${cluster.riskScore}/100`);
                console.log(`${BOLD}Threat Intel:${RESET}  ${cluster.hasThreatIntel ? RED + '⚠️  YES' : GREEN + '✅ Clean'}${RESET}`);
                if (cluster.threatCategories.length > 0) {
                    console.log(`${BOLD}Categories:${RESET}    ${cluster.threatCategories.join(', ')}`);
                }
                console.log(`\n${BOLD}Addresses in cluster:${RESET}`);
                for (const addr of cluster.addresses.slice(0, 10)) {
                    console.log(`  ${addr}`);
                }
                if (cluster.addresses.length > 10) {
                    console.log(`  ... and ${cluster.addresses.length - 10} more`);
                }
            }
        }
        else {
            // Run full clustering
            console.log(`Running full clustering on all ingested transactions...\n`);
            const stats = await engine.clusterAll();
            console.log(`\n${BOLD}📊 Clustering Results${RESET}`);
            console.log(`${'─'.repeat(48)}`);
            console.log(`Total addresses:       ${stats.totalAddresses}`);
            console.log(`Total clusters:        ${stats.totalClusters}`);
            console.log(`Clusters with threat:  ${stats.clustersWithThreat > 0 ? RED + stats.clustersWithThreat + RESET : GREEN + stats.clustersWithThreat + RESET}`);
            console.log(`Largest cluster:       ${stats.largestClusterSize} addresses`);
            console.log(`Processing time:       ${stats.processingTimeMs}ms`);
            console.log(`${'─'.repeat(48)}`);
            if (stats.clustersWithThreat > 0) {
                console.log(`\n${RED}${BOLD}⚠️  ${stats.clustersWithThreat} cluster(s) flagged via threat intel propagation${RESET}`);
                console.log(`Run: npm run cluster -- --address <addr> to inspect a specific cluster`);
            }
            else {
                console.log(`\n${GREEN}✅ No threat intel matches found in current dataset${RESET}`);
            }
        }
        await db.end();
    })();
}
function colorLevel(level) {
    const RESET = '\x1b[0m';
    if (level === 'critical')
        return `\x1b[31m\x1b[1m${level.toUpperCase()}\x1b[0m`;
    if (level === 'high')
        return `\x1b[31m${level}${RESET}`;
    if (level === 'medium')
        return `\x1b[33m${level}${RESET}`;
    if (level === 'low')
        return `\x1b[32m${level}${RESET}`;
    return level;
}
//# sourceMappingURL=index.js.map