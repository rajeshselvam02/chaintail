import EventEmitter from 'eventemitter3';
import WebSocket from 'ws';
import { NodeConnector } from '@chaintail/node-connector';
import Redis from 'ioredis';
import { Pool } from 'pg';

const MEMPOOL_WS = 'wss://mempool.space/api/v1/ws';

export interface WatcherConfig {
  maxTrackedTxs?: number;
  watchAddresses?: string[];
  reconnectDelayMs?: number;
}

export class WebSocketWatcher extends EventEmitter {
  private ws: WebSocket | null = null;
  private watchAddresses = new Set<string>();
  private trackedCount = 0;
  private running = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectDelay: number;
  private useRedis = true;

  constructor(
    private connector: NodeConnector,
    private redis: Redis,
    private db: Pool,
    private config: WatcherConfig = {}
  ) {
    super();
    this.reconnectDelay = config.reconnectDelayMs || 5000;
    config.watchAddresses?.forEach(a => this.watchAddresses.add(a));
    this.redis.on('error', () => { this.useRedis = false; });
    this.redis.on('connect', () => { this.useRedis = true; });
  }

  watchAddress(address: string): void {
    this.watchAddresses.add(address);
    console.log(`\n👁  Watching: ${address}`);
    this.send({ 'track-address': address });
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.loadWatchedAddresses();
    this.connect();
  }

  stop(): void {
    this.running = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) { this.ws.terminate(); this.ws = null; }
    console.log('\n🛑 Stopped.');
  }

  private connect(): void {
    console.log('🔌 Connecting to mempool.space...');
    this.ws = new WebSocket(MEMPOOL_WS);

    this.ws.on('open', () => {
      console.log('✅ Connected — live Bitcoin transaction stream active\n');
      this.send({ action: 'init' });
      this.send({ action: 'want', data: ['blocks', 'mempool-blocks', 'stats'] });
      for (const address of this.watchAddresses) {
        this.send({ 'track-address': address });
      }
    });

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        await this.handleMessage(msg);
      } catch { }
    });

    this.ws.on('close', (code) => {
      console.log(`\n🔌 Disconnected (${code}) — reconnecting in ${this.reconnectDelay/1000}s...`);
      if (this.running) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
      }
    });

    this.ws.on('error', (err) => {
      console.error('\n❌ WS error:', err.message);
    });
  }

  private async handleMessage(msg: any): Promise<void> {
    // Live transactions pushed by mempool.space
    if (msg.transactions && Array.isArray(msg.transactions)) {
      for (const tx of msg.transactions) {
        await this.processTx(tx);
      }
    }

    // Mempool stats
    if (msg.mempoolInfo) {
      process.stdout.write(
        `\r📊 Mempool: ${msg.mempoolInfo.size} txs | ` +
        `tracked: ${this.trackedCount} | ` +
        `fee: ${msg.fees?.fastestFee || '?'} sat/vB | ` +
        `watching: ${this.watchAddresses.size} addrs    `
      );
    }

    // New block
    if (msg.block) {
      console.log(`\n⛏  Block #${msg.block.height} — ${msg.block.tx_count} txs | ` +
        `size: ${(msg.block.size / 1024).toFixed(0)}KB`);
      this.emit('new_block', msg.block);
    }

    // Watched address hit
    if (msg['address-transactions']) {
      for (const tx of msg['address-transactions']) {
        await this.handleAddressHit(tx);
      }
    }
    if (msg['address-mempool']) {
      for (const tx of msg['address-mempool']) {
        await this.handleAddressHit(tx);
      }
    }
  }

  private async processTx(tx: any): Promise<void> {
    if (!tx?.txid) return;

    // Save to DB
    await this.db.query(`
      INSERT INTO mempool_snapshots (txid, fee, size, fee_rate, ancestor_count, descendant_count)
      VALUES ($1,$2,$3,$4,0,0) ON CONFLICT DO NOTHING
    `, [tx.txid, tx.fee || 0, Math.round(tx.vsize || 0), tx.rate || 0]).catch(() => {});

    // Cache in Redis
    if (this.useRedis) {
      await this.redis.setex(
        `mempool:${tx.txid}`, 3600,
        JSON.stringify({ txid: tx.txid, fee: tx.fee, vsize: tx.vsize, value: tx.value, rate: tx.rate })
      ).catch(() => {});
    }

    this.trackedCount++;
    this.emit('new_tx', tx);
  }

  private async handleAddressHit(tx: any): Promise<void> {
    if (!tx?.txid) return;
    await this.processTx(tx);

    const allAddresses = [
      ...(tx.vin || []).map((i: any) => i.prevout?.scriptpubkey_address),
      ...(tx.vout || []).map((o: any) => o.scriptpubkey_address),
    ].filter(Boolean) as string[];

    for (const addr of allAddresses) {
      if (this.watchAddresses.has(addr)) {
        console.log(`\n🚨 WATCHED ADDRESS HIT: ${addr}`);
        console.log(`   TX: ${tx.txid}`);
        console.log(`   Value: ${(tx.value / 1e8).toFixed(8)} BTC | Fee: ${tx.fee} sat`);
        this.emit('address_hit', addr, tx.txid);
        await this.db.query(
          `INSERT INTO alerts (address, txid, reason, severity) VALUES ($1,$2,$3,$4)`,
          [addr, tx.txid, 'Watched address active in mempool', 'high']
        ).catch(() => {});
      }
    }

    // Threat intel check
    if (allAddresses.length > 0) {
      const { rows } = await this.db.query(`
        SELECT address, label, category FROM threat_intel WHERE address = ANY($1::text[])
      `, [allAddresses]).catch(() => ({ rows: [] as any[] }));

      for (const row of rows) {
        console.log(`\n💀 THREAT INTEL HIT: ${row.label} [${row.category}]`);
        console.log(`   Address: ${row.address}`);
        console.log(`   TX: ${tx.txid}`);
        this.emit('threat_hit', row, tx.txid);
        await this.db.query(
          `INSERT INTO alerts (address, txid, reason, severity) VALUES ($1,$2,$3,$4)`,
          [row.address, tx.txid, `Threat intel: ${row.label} (${row.category})`, 'critical']
        ).catch(() => {});
      }
    }
  }

  private async loadWatchedAddresses(): Promise<void> {
    try {
      const { rows } = await this.db.query(`SELECT address FROM watched_addresses WHERE active = true`);
      rows.forEach((r: any) => this.watchAddresses.add(r.address));
      console.log(`👁  Loaded ${rows.length} watched addresses`);
    } catch { }
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  getStats() {
    return {
      tracked: this.trackedCount,
      watching: this.watchAddresses.size,
      connected: this.ws?.readyState === WebSocket.OPEN,
    };
  }
}
