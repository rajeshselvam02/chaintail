"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockstreamApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
class BlockstreamApiClient {
    constructor(network = 'mainnet') {
        const baseURL = network === 'mainnet'
            ? 'https://blockstream.info/api'
            : 'https://blockstream.info/testnet/api';
        this.client = axios_1.default.create({ baseURL, timeout: 15000 });
    }
    async getTransaction(txid) {
        const { data } = await this.client.get(`/tx/${txid}`);
        return this.mapTransaction(data);
    }
    async getAddressInfo(address) {
        const { data } = await this.client.get(`/address/${address}`);
        return {
            address,
            balance: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
            totalReceived: data.chain_stats.funded_txo_sum,
            totalSent: data.chain_stats.spent_txo_sum,
            txCount: data.chain_stats.tx_count,
        };
    }
    async getAddressTransactions(address) {
        const { data } = await this.client.get(`/address/${address}/txs`);
        return data.map((tx) => this.mapTransaction(tx));
    }
    async getMempoolTxids() {
        const { data } = await this.client.get('/mempool/txids');
        return data;
    }
    async getMempoolStats() {
        const { data } = await this.client.get('/mempool');
        return data;
    }
    mapTransaction(data) {
        const inputs = data.vin.map((vin) => ({
            txid: data.txid,
            vout: vin.vout ?? 0,
            fromAddress: vin.prevout?.scriptpubkey_address ?? null,
            valueSatoshi: vin.prevout?.value ?? 0,
            sequence: vin.sequence,
        }));
        const outputs = data.vout.map((vout, i) => ({
            n: i,
            toAddress: vout.scriptpubkey_address ?? null,
            valueSatoshi: vout.value ?? 0,
            scriptType: vout.scriptpubkey_type ?? 'unknown',
            spent: false,
        }));
        return {
            txid: data.txid,
            blockHeight: data.status?.block_height ?? null,
            blockHash: data.status?.block_hash ?? null,
            timestamp: data.status?.block_time ?? null,
            fee: data.fee ?? 0,
            size: data.size ?? 0,
            isConfirmed: data.status?.confirmed ?? false,
            inputs,
            outputs,
        };
    }
}
exports.BlockstreamApiClient = BlockstreamApiClient;
//# sourceMappingURL=api-client.js.map