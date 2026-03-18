"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeConnector = void 0;
const rpc_client_1 = require("./rpc-client");
const api_client_1 = require("./api-client");
class NodeConnector {
    constructor(config) {
        this.config = config;
        this.rpc = null;
        this.useRpc = false;
        this.api = new api_client_1.BlockstreamApiClient(config.network === 'mainnet' ? 'mainnet' : 'testnet');
        if (!config.useApi) {
            this.rpc = new rpc_client_1.BitcoinRpcClient(config);
        }
    }
    async connect() {
        if (this.rpc) {
            const alive = await this.rpc.ping();
            if (alive) {
                this.useRpc = true;
                console.log('✅ Connected to Bitcoin Core via RPC');
                return;
            }
            console.warn('⚠️  Bitcoin Core RPC not reachable, falling back to Blockstream API');
        }
        console.log('✅ Using Blockstream API');
    }
    async getTransaction(txid) {
        if (this.useRpc && this.rpc) {
            const raw = await this.rpc.getRawTransaction(txid, true);
            return this.mapRpcTransaction(raw);
        }
        return this.api.getTransaction(txid);
    }
    async getMempoolTxids() {
        if (this.useRpc && this.rpc) {
            const mempool = await this.rpc.getRawMempool(false);
            return Array.isArray(mempool) ? mempool : Object.keys(mempool);
        }
        return this.api.getMempoolTxids();
    }
    async getAddressTransactions(address) {
        return this.api.getAddressTransactions(address);
    }
    async getAddressInfo(address) {
        return this.api.getAddressInfo(address);
    }
    isUsingRpc() { return this.useRpc; }
    mapRpcTransaction(raw) {
        return {
            txid: raw.txid,
            blockHeight: raw.height ?? null,
            blockHash: raw.blockhash ?? null,
            timestamp: raw.time ?? null,
            fee: 0,
            size: raw.size ?? 0,
            isConfirmed: !!raw.blockhash,
            inputs: (raw.vin || []).map((vin) => ({
                txid: raw.txid,
                vout: vin.vout ?? 0,
                fromAddress: null,
                valueSatoshi: 0,
                sequence: vin.sequence,
            })),
            outputs: (raw.vout || []).map((vout, i) => ({
                n: i,
                toAddress: vout.scriptPubKey?.addresses?.[0] ?? vout.scriptPubKey?.address ?? null,
                valueSatoshi: Math.round((vout.value ?? 0) * 1e8),
                scriptType: vout.scriptPubKey?.type ?? 'unknown',
                spent: false,
            })),
        };
    }
}
exports.NodeConnector = NodeConnector;
//# sourceMappingURL=connector.js.map