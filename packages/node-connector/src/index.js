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
exports.BlockstreamApiClient = exports.BitcoinRpcClient = exports.NodeConnector = void 0;
const connector_1 = require("./connector");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
var connector_2 = require("./connector");
Object.defineProperty(exports, "NodeConnector", { enumerable: true, get: function () { return connector_2.NodeConnector; } });
var rpc_client_1 = require("./rpc-client");
Object.defineProperty(exports, "BitcoinRpcClient", { enumerable: true, get: function () { return rpc_client_1.BitcoinRpcClient; } });
var api_client_1 = require("./api-client");
Object.defineProperty(exports, "BlockstreamApiClient", { enumerable: true, get: function () { return api_client_1.BlockstreamApiClient; } });
if (require.main === module) {
    const config = {
        rpcHost: process.env.BTC_RPC_HOST || 'localhost',
        rpcPort: parseInt(process.env.BTC_RPC_PORT || '8332'),
        rpcUser: process.env.BTC_RPC_USER || 'bitcoin',
        rpcPassword: process.env.BTC_RPC_PASSWORD || 'bitcoin',
        network: process.env.BTC_NETWORK || 'mainnet',
        useApi: process.env.USE_API === 'true',
    };
    (async () => {
        const connector = new connector_1.NodeConnector(config);
        await connector.connect();
        const testTxid = 'f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16';
        console.log('\n📦 Fetching first ever BTC transaction...');
        const tx = await connector.getTransaction(testTxid);
        console.log('TxID:', tx.txid);
        console.log('Confirmed:', tx.isConfirmed);
        console.log('Block:', tx.blockHeight);
        console.log('Outputs:', tx.outputs.length);
        console.log('First output to:', tx.outputs[0]?.toAddress);
    })();
}
//# sourceMappingURL=index.js.map