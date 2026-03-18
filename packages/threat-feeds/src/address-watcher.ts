import { Pool } from 'pg';
import { WebhookEngine } from './webhooks';

export class AddressWatcher {
  private watchedAddresses = new Set<string>();

  constructor(
    private db: Pool,
    private webhooks: WebhookEngine
  ) {}

  async load(): Promise<void> {
    try {
      const { rows } = await this.db.query(
        `SELECT address FROM watched_addresses WHERE active = true`
      );
      rows.forEach(r => this.watchedAddresses.add(r.address));
      console.log(`👁  Loaded ${this.watchedAddresses.size} watched addresses`);
    } catch {
      console.log('👁  No watched addresses table yet');
    }
  }

  async watch(address: string, label?: string): Promise<void> {
    this.watchedAddresses.add(address);
    await this.db.query(`
      INSERT INTO watched_addresses (address, label, active)
      VALUES ($1, $2, true)
      ON CONFLICT (address) DO UPDATE SET active = true
    `, [address, label || address]);
    console.log(`👁  Now watching: ${address}`);
  }

  async unwatch(address: string): Promise<void> {
    this.watchedAddresses.delete(address);
    await this.db.query(
      `UPDATE watched_addresses SET active = false WHERE address = $1`, [address]
    );
  }

  async checkTransaction(txid: string, addresses: string[]): Promise<void> {
    for (const address of addresses) {
      if (this.watchedAddresses.has(address)) {
        console.log(`🚨 Watched address hit: ${address} in ${txid}`);

        // Save alert
        await this.db.query(`
          INSERT INTO alerts (address, txid, reason, severity)
          VALUES ($1, $2, $3, $4)
        `, [address, txid, 'Watched address detected in mempool', 'high']);

        // Fire webhooks
        await this.webhooks.send('address_hit', { address, txid });

        // Fire Telegram if configured
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
          await this.webhooks.sendTelegram(
            process.env.TELEGRAM_BOT_TOKEN,
            process.env.TELEGRAM_CHAT_ID,
            'address_hit',
            { address, txid }
          );
        }

        // Fire Discord if configured
        if (process.env.DISCORD_WEBHOOK_URL) {
          await this.webhooks.sendDiscord(
            process.env.DISCORD_WEBHOOK_URL,
            'address_hit',
            { address, txid }
          );
        }
      }
    }
  }

  getWatchedAddresses(): string[] {
    return [...this.watchedAddresses];
  }

  isWatched(address: string): boolean {
    return this.watchedAddresses.has(address);
  }
}
