"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BitcoinRpcClient = void 0;
const axios_1 = __importDefault(require("axios"));
class BitcoinRpcClient {
    constructor(config) {
        this.config = config;
        this.requestId = 0;
        this.client = axios_1.default.create({
            baseURL: `http://${config.rpcHost}:${config.rpcPort}`,
            auth: { username: config.rpcUser, password: config.rpcPassword },
            timeout: 30000,
        });
    }
    async call(method, params = []) {
        const response = await this.client.post('/', {
            jsonrpc: '1.0',
            id: ++this.requestId,
            method,
            params,
        });
        if (response.data.error) {
            throw new Error(`RPC Error [${method}]: ${response.data.error.message}`);
        }
        return response.data.result;
    }
    async getBlockCount() { return this.call('getblockcount'); }
    async getRawTransaction(txid, verbose = true) { return this.call('getrawtransaction', [txid, verbose]); }
    async getRawMempool(verbose = false) { return this.call('getrawmempool', [verbose]); }
    async getMempoolEntry(txid) { return this.call('getmempoolentry', [txid]); }
    async getBlockHash(height) { return this.call('getblockhash', [height]); }
    async ping() {
        try {
            await this.call('ping');
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.BitcoinRpcClient = BitcoinRpcClient;
//# sourceMappingURL=rpc-client.js.map