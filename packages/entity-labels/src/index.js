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
exports.KNOWN_ENTITIES = exports.EntityLookup = exports.EntityImporter = void 0;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const importer_1 = require("./importer");
const lookup_1 = require("./lookup");
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
var importer_2 = require("./importer");
Object.defineProperty(exports, "EntityImporter", { enumerable: true, get: function () { return importer_2.EntityImporter; } });
var lookup_2 = require("./lookup");
Object.defineProperty(exports, "EntityLookup", { enumerable: true, get: function () { return lookup_2.EntityLookup; } });
var known_entities_1 = require("./known-entities");
Object.defineProperty(exports, "KNOWN_ENTITIES", { enumerable: true, get: function () { return known_entities_1.KNOWN_ENTITIES; } });
const db = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'chaintail',
    password: process.env.DB_PASSWORD || 'chaintail',
    database: process.env.DB_NAME || 'chaintail',
});
if (require.main === module) {
    const command = process.argv[2];
    (async () => {
        if (command === 'seed') {
            const importer = new importer_1.EntityImporter(db);
            const stats = await importer.importAll();
            console.log(`\n📊 Entity Import Summary`);
            console.log(`${'─'.repeat(40)}`);
            console.log(`Entities imported:  ${stats.entitiesImported}`);
            console.log(`Addresses imported: ${stats.addressesImported}`);
            console.log(`Skipped:            ${stats.skipped}`);
        }
        if (command === 'lookup') {
            const address = process.argv[3];
            if (!address) {
                console.log('Usage: npm run dev lookup <address>');
                process.exit(1);
            }
            const lookup = new lookup_1.EntityLookup(db);
            const result = await lookup.lookupAddress(address);
            if (result) {
                console.log('\n🏷  Entity Found:');
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                console.log('❌ No entity found for this address');
            }
        }
        if (command === 'stats') {
            const lookup = new lookup_1.EntityLookup(db);
            const stats = await lookup.getStats();
            console.log('\n📊 Entity Database Stats:');
            console.log(JSON.stringify(stats, null, 2));
        }
        await db.end();
    })();
}
//# sourceMappingURL=index.js.map