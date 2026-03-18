import EventEmitter from 'eventemitter3';
import { NodeConnector } from '@chaintail/node-connector';
import { MempoolEntry } from '@chaintail/shared';
import Redis from 'ioredis';
import { Pool } from 'pg';

export interface WatcherConfig {
  pollIntervalMs: number;
  maxTrackedTxs: number;
  watchAddresses?: string[];
}

export interface MempoolStats {
  totalTracked: number;
  newThisCycle: number;
  confirmedThisCycle: number;
  droppedThisCycle: number;
  cycleMs: number;
  timestamp: Date;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class MempoolWatcher extends EventEmitter {
  private trackedTxids = new Set<string>();
  private watchAddresses = new Set<string>();
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    private connector: NodeConnector,
    private redis: Redis,
    private db: Pool,
    private config: WatcherConfig
  ) {
    super();
    config.watchAddresses?.forEach(a => this.watchAddresses.add(a));
  }

  watchAddress(address: string): void {
    this.watchAddresses.add(address);
    console.log(`👁  Watching: ${address}`);
  }

  unwatchAddress(address: string): void {
    this.watchAddresses.delete(address);
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    console.log(`🚀 Mempool watcher started (interval: ${this.config.pollIntervalMs}ms)`);
    await this.poll();
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    console.log('🛑 Mempool watcher stopped.');
  }

  private async poll(): Promise<void> {
    if (!this.running) return;
    const start = Date.now();
    let newCount = 0, confirmedCount = 0, droppedCount = 0;

    try {
      console.log('🔍 Fetching mempool txids...');
      const currentTxids = await this.connector.getMempoolTxids();
      const currentSet = new Set(currentTxids);
      console.log(`📋 Mempool size: ${currentTxids.length} txs`);

      const newTxids = currentTxids.filter(txid => !this.trackedTxids.has(txid));
      const removedTxids = [...this.trackedTxids].filter(txid => !currentSet.has(txid));

      console.log(`🆕 New: ${newTxids.length} | 🗑 Removed: ${removedTxids.length}`);

      // Only fetch details for first 5 per cycle to avoid rate limits
      for (const txid of newTxids.slice(0, 5)) {
        try {
          const tx = await this.connector.getTransaction(txid);
          const entry: MempoolEntry = {
            txid,
            fee: tx.fee,
            size: tx.size,
            time: Date.now(),
            descendantCount: 0,
            ancestorCount: 0,
            rawTx: tx,
          };

          await this.saveMempoolEntry(entry);
          this.emit('new_tx', entry);
          newCount++;

          // Check watched addresses
          const allAddresses = [
            ...tx.inputs.map(i => i.fromAddress),
            ...tx.outputs.map(o => o.toAddress),
          ].filter(Boolean) as string[];

          for (const addr of allAddresses) {
            if (this.watchAddresses.has(addr)) {
              console.log(`🚨 ALERT: Watched address ${addr} in tx ${txid}`);
              this.emit('address_hit', addr, txid);
              await this.saveAlert(addr, txid, 'Watched address active in mempool');
            }
          }

          this.trackedTxids.add(txid);
          await sleep(500); // 500ms between tx fetches to respect rate limits
        } catch (err) {
          // Skip individual tx errors
        }
      }

      // Track all remaining new txids without fetching details
      for (const txid of newTxids.slice(5)) {
        this.trackedTxids.add(txid);
      }

      // Handle removed txs
      for (const txid of removedTxids.slice(0, 10)) {
        const isConfirmed = await this.checkConfirmed(txid);
        if (isConfirmed) {
          this.emit('confirmed_tx', txid);
          confirmedCount++;
          await this.markConfirmed(txid);
        } else {
          this.emit('dropped_tx', txid);
          droppedCount++;
          await this.markDropped(txid);
        }
        this.trackedTxids.delete(txid);
      }

      // Trim if too large
      if (this.trackedTxids.size > this.config.maxTrackedTxs) {
        const excess = [...this.trackedTxids].slice(0, this.trackedTxids.size - this.config.maxTrackedTxs);
        excess.forEach(txid => this.trackedTxids.delete(txid));
      }

      const stats: MempoolStats = {
        totalTracked: this.trackedTxids.size,
        newThisCycle: newCount,
        confirmedThisCycle: confirmedCount,
        droppedThisCycle: droppedCount,
        cycleMs: Date.now() - start,
        timestamp: new Date(),
      };

      this.emit('stats', stats);
      console.log(`📊 tracked: ${stats.totalTracked} | new details fetched: ${newCount} | confirmed: ${confirmedCount} | dropped: ${droppedCount} | ${stats.cycleMs}ms\n`);

    } catch (err) {
      this.emit('error', err as Error);
      console.error('❌ Poll error:', (err as Error).message);
    }

    this.pollTimer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  private async saveMempoolEntry(entry: MempoolEntry): Promise<void> {
    const feeRate = entry.size > 0 ? entry.fee / entry.size : 0;
    await this.db.query(
      `INSERT INTO mempool_snapshots (txid, fee, size, fee_rate, ancestor_count, descendant_count)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
      [entry.txid, entry.fee, entry.size, feeRate, entry.ancestorCount, entry.descendantCount]
    );
    await this.redis.setex(`mempool:${entry.txid}`, 3600, JSON.stringify(entry));
  }

  private async saveAlert(address: string, txid: string, reason: string): Promise<void> {
    await this.db.query(
      `INSERT INTO alerts (address, txid, reason, severity) VALUES ($1, $2, $3, $4)`,
      [address, txid, reason, 'high']
    );
  }

  private async checkConfirmed(txid: string): Promise<boolean> {
    try {
      const tx = await this.connector.getTransaction(txid);
      return tx.isConfirmed;
    } catch { return false; }
  }

  private async markConfirmed(txid: string): Promise<void> {
    await this.db.query(
      `UPDATE mempool_snapshots SET confirmed_at = NOW() WHERE txid = $1`, [txid]
    );
    await this.redis.del(`mempool:${txid}`);
  }

  private async markDropped(txid: string): Promise<void> {
    await this.db.query(
      `UPDATE mempool_snapshots SET dropped_at = NOW() WHERE txid = $1`, [txid]
    );
    await this.redis.del(`mempool:${txid}`);
  }
}
