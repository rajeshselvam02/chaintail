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
exports.RiskScorer = exports.GraphTracer = void 0;
const tracer_1 = require("./tracer");
const node_connector_1 = require("@chaintail/node-connector");
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
var tracer_2 = require("./tracer");
Object.defineProperty(exports, "GraphTracer", { enumerable: true, get: function () { return tracer_2.GraphTracer; } });
var risk_scorer_1 = require("./risk-scorer");
Object.defineProperty(exports, "RiskScorer", { enumerable: true, get: function () { return risk_scorer_1.RiskScorer; } });
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
function colorScore(score) {
    if (score >= 80)
        return `${RED}${BOLD}${score}/100 🔴 CRITICAL${RESET}`;
    if (score >= 60)
        return `${RED}${score}/100 🔴 HIGH${RESET}`;
    if (score >= 30)
        return `${YELLOW}${score}/100 🟡 MEDIUM${RESET}`;
    return `${GREEN}${score}/100 🟢 LOW${RESET}`;
}
if (require.main === module) {
    const args = process.argv.slice(2);
    const addressIdx = args.indexOf('--address');
    const hopsIdx = args.indexOf('--hops');
    const dirIdx = args.indexOf('--direction');
    const address = addressIdx !== -1 ? args[addressIdx + 1] : null;
    const hops = hopsIdx !== -1 ? parseInt(args[hopsIdx + 1]) : 5;
    const direction = dirIdx !== -1 ? args[dirIdx + 1] : 'backward';
    if (!address) {
        console.log(`
${BOLD}ChainTrail Graph Tracer${RESET}
Usage: npm run trace -- --address <btc_address> [--hops 5] [--direction backward|forward]

Example:
  npm run trace -- --address bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh --hops 5
  npm run trace -- --address 1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf --hops 3 --direction forward
    `);
        process.exit(0);
    }
    const nodeConfig = {
        rpcHost: process.env.BTC_RPC_HOST || 'localhost',
        rpcPort: parseInt(process.env.BTC_RPC_PORT || '8332'),
        rpcUser: process.env.BTC_RPC_USER || 'bitcoin',
        rpcPassword: process.env.BTC_RPC_PASSWORD || 'bitcoin',
        network: process.env.BTC_NETWORK || 'mainnet',
        useApi: process.env.USE_API === 'true',
    };
    const db = new pg_1.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'chaintail',
        password: process.env.DB_PASSWORD || 'chaintail',
        database: process.env.DB_NAME || 'chaintail',
    });
    (async () => {
        const connector = new node_connector_1.NodeConnector(nodeConfig);
        await connector.connect();
        const tracer = new tracer_1.GraphTracer(db, connector);
        console.log(`\n${BOLD}╔══════════════════════════════════════════════╗${RESET}`);
        console.log(`${BOLD}║         ChainTrail Graph Tracer              ║${RESET}`);
        console.log(`${BOLD}╚══════════════════════════════════════════════╝${RESET}`);
        console.log(`\n${CYAN}Target:${RESET}    ${address}`);
        console.log(`${CYAN}Hops:${RESET}      ${hops}`);
        console.log(`${CYAN}Direction:${RESET} ${direction}`);
        console.log(`${'─'.repeat(48)}`);
        const result = await tracer.trace(address, hops, direction);
        console.log(`\n${BOLD}📊 Trace Results${RESET}`);
        console.log(`${'─'.repeat(48)}`);
        console.log(`Nodes found:     ${result.nodes.length}`);
        console.log(`Flagged:         ${result.flaggedAddresses.length}`);
        console.log(`Total value:     ${(result.totalValueTraced / 1e8).toFixed(8)} BTC`);
        console.log(`Risk Score:      ${colorScore(result.riskResult.totalScore)}`);
        if (result.nodes.length > 0) {
            console.log(`\n${BOLD}🔗 Transaction Graph${RESET}`);
            console.log(`${'─'.repeat(48)}`);
            const byHop = result.nodes.reduce((acc, node) => {
                if (!acc[node.hop])
                    acc[node.hop] = [];
                acc[node.hop].push(node);
                return acc;
            }, {});
            for (const [hop, nodes] of Object.entries(byHop)) {
                console.log(`\n  Hop ${hop}:`);
                for (const node of nodes.slice(0, 5)) {
                    const flag = node.threatCategory ? ` 🚨 ${node.threatCategory?.toUpperCase()}` : '';
                    const val = (node.valueSatoshi / 1e8).toFixed(8);
                    console.log(`    ${node.address?.slice(0, 20)}... | ${val} BTC | tx: ${node.txid?.slice(0, 12)}...${flag}`);
                }
                if (nodes.length > 5)
                    console.log(`    ... and ${nodes.length - 5} more`);
            }
        }
        if (result.flaggedAddresses.length > 0) {
            console.log(`\n${RED}${BOLD}🚨 Flagged Addresses${RESET}`);
            console.log(`${'─'.repeat(48)}`);
            for (const f of result.flaggedAddresses) {
                console.log(`  Address:  ${f.address}`);
                console.log(`  Category: ${f.threatCategory}`);
                console.log(`  Label:    ${f.threatLabel}`);
                console.log(`  Hop:      ${f.hop}`);
                console.log(`  TxID:     ${f.txid}`);
                console.log('');
            }
        }
        if (result.riskResult.factors.length > 0) {
            console.log(`${BOLD}⚠️  Risk Factors${RESET}`);
            console.log(`${'─'.repeat(48)}`);
            for (const f of result.riskResult.factors) {
                console.log(`  [${f.severity.toUpperCase()}] ${f.reason} (+${f.score})`);
            }
        }
        console.log(`\n${'─'.repeat(48)}`);
        console.log(`${BOLD}Final Risk Score: ${colorScore(result.riskResult.totalScore)}${RESET}\n`);
        await db.end();
        process.exit(0);
    })();
}
//# sourceMappingURL=index.js.map