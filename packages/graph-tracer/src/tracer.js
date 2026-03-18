"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphTracer = void 0;
const queries_1 = require("./queries");
const risk_scorer_1 = require("./risk-scorer");
class GraphTracer {
    constructor(db, connector) {
        this.db = db;
        this.connector = connector;
        this.scorer = new risk_scorer_1.RiskScorer();
    }
    async trace(address, hops = 5, direction = 'backward') {
        // First ingest recent txs for this address into DB
        await this.ingestAddressTransactions(address);
        // Run recursive graph traversal
        const query = direction === 'backward' ? queries_1.TRACE_BACKWARD : queries_1.TRACE_FORWARD;
        const { rows } = await this.db.query(query, [address, hops]);
        const nodes = rows.map((row) => ({
            address: direction === 'backward' ? row.from_address : row.to_address,
            txid: row.txid,
            valueSatoshi: parseInt(row.value_satoshi || '0'),
            hop: row.hop,
            path: row.path,
        }));
        // Check all addresses against threat intel
        const allAddresses = [...new Set(nodes.map(n => n.address).filter(Boolean))];
        const flagged = await this.checkThreatIntel(allAddresses, nodes);
        // Calculate risk for the target address
        const riskFactors = [];
        for (const f of flagged) {
            if (f.threatCategory) {
                const hopFactor = this.scorer.factorFromHopDistance(f.hop, 80);
                riskFactors.push(hopFactor);
            }
        }
        const riskResult = this.scorer.score(address, riskFactors);
        // Persist risk score
        await this.db.query(queries_1.UPSERT_ADDRESS, [
            address,
            riskResult.totalScore,
            riskResult.factors.map(f => f.reason),
        ]);
        // Save alert if high risk
        if (riskResult.totalScore >= 60 && flagged.length > 0) {
            await this.db.query(queries_1.SAVE_TRACE_RESULT, [
                address,
                flagged[0].txid,
                `High risk trace: connected to ${flagged[0].threatCategory} within ${flagged[0].hop} hops`,
                riskResult.level,
                JSON.stringify({ flagged, riskResult }),
            ]);
        }
        return {
            targetAddress: address,
            direction,
            hops,
            nodes,
            riskResult,
            flaggedAddresses: flagged,
            totalValueTraced: nodes.reduce((sum, n) => sum + n.valueSatoshi, 0),
        };
    }
    async ingestAddressTransactions(address) {
        console.log(`📥 Ingesting transactions for ${address}...`);
        try {
            const txs = await this.connector.getAddressTransactions(address);
            for (const tx of txs.slice(0, 20)) {
                await this.saveTx(tx);
            }
            console.log(`   Saved ${Math.min(txs.length, 20)} transactions`);
        }
        catch (err) {
            console.warn(`   Could not ingest txs: ${err.message}`);
        }
    }
    async saveTx(tx) {
        await this.db.query(`INSERT INTO transactions (txid, block_height, block_hash, timestamp, fee, size, is_confirmed, raw_data)
       VALUES ($1,$2,$3,to_timestamp($4),$5,$6,$7,$8)
       ON CONFLICT (txid) DO NOTHING`, [tx.txid, tx.blockHeight, tx.blockHash, tx.timestamp,
            tx.fee, tx.size, tx.isConfirmed, JSON.stringify(tx)]);
        for (const [i, input] of tx.inputs.entries()) {
            await this.db.query(`INSERT INTO tx_inputs (txid, from_address, prev_txid, prev_vout, value_satoshi, vin_index)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, [tx.txid, input.fromAddress, input.txid, input.vout, input.valueSatoshi, i]);
        }
        for (const output of tx.outputs) {
            await this.db.query(`INSERT INTO tx_outputs (txid, to_address, value_satoshi, vout_index, script_type)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [tx.txid, output.toAddress, output.valueSatoshi, output.n, output.scriptType]);
        }
    }
    async checkThreatIntel(addresses, nodes) {
        if (addresses.length === 0)
            return [];
        const { rows } = await this.db.query(queries_1.CHECK_THREAT_INTEL, [addresses]);
        const threatMap = new Map(rows.map((r) => [r.address, r]));
        const flagged = [];
        for (const node of nodes) {
            const threat = threatMap.get(node.address);
            if (threat) {
                node.riskScore = threat.confidence;
                node.threatLabel = threat.label;
                node.threatCategory = threat.category;
                flagged.push(node);
            }
        }
        return flagged;
    }
}
exports.GraphTracer = GraphTracer;
//# sourceMappingURL=tracer.js.map