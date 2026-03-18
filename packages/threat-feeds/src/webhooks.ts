import axios from 'axios';
import { Pool } from 'pg';

export interface WebhookConfig {
  id?: string;
  url: string;
  name: string;
  events: WebhookEvent[];
  secret?: string;
  active: boolean;
}

export type WebhookEvent =
  | 'address_hit'
  | 'high_risk_trace'
  | 'new_threat_intel'
  | 'cluster_flagged';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
}

export class WebhookEngine {
  constructor(private db: Pool) {}

  async send(event: WebhookEvent, data: any): Promise<void> {
    const webhooks = await this.getActiveWebhooks(event);

    for (const webhook of webhooks) {
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      try {
        await axios.post(webhook.url, payload, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-ChainTrail-Event': event,
            ...(webhook.secret && { 'X-ChainTrail-Secret': webhook.secret }),
          },
        });
        console.log(`📡 Webhook sent: ${event} → ${webhook.name}`);
        await this.logDelivery(webhook.id!, event, 'success');
      } catch (err: any) {
        console.error(`❌ Webhook failed: ${webhook.name} — ${err.message}`);
        await this.logDelivery(webhook.id!, event, 'failed', err.message);
      }
    }
  }

  async sendTelegram(botToken: string, chatId: string, event: WebhookEvent, data: any): Promise<void> {
    const message = this.formatTelegramMessage(event, data);
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      });
      console.log(`📱 Telegram alert sent: ${event}`);
    } catch (err: any) {
      console.error(`❌ Telegram failed: ${err.message}`);
    }
  }

  async sendDiscord(webhookUrl: string, event: WebhookEvent, data: any): Promise<void> {
    const embed = this.formatDiscordEmbed(event, data);
    try {
      await axios.post(webhookUrl, { embeds: [embed] });
      console.log(`💬 Discord alert sent: ${event}`);
    } catch (err: any) {
      console.error(`❌ Discord failed: ${err.message}`);
    }
  }

  private formatTelegramMessage(event: WebhookEvent, data: any): string {
    switch (event) {
      case 'address_hit':
        return `🚨 <b>ChainTrail Alert</b>\n\nWatched address detected in mempool!\n\n<code>${data.address}</code>\n\nTx: <code>${data.txid}</code>\nTime: ${new Date().toISOString()}`;
      case 'high_risk_trace':
        return `⚠️ <b>High Risk Trace</b>\n\nAddress: <code>${data.address}</code>\nRisk Score: ${data.riskScore}/100\nLevel: ${data.level.toUpperCase()}\nFlagged: ${data.flaggedCount} address(es)`;
      case 'cluster_flagged':
        return `🔴 <b>Cluster Flagged</b>\n\nCluster ID: ${data.clusterId}\nCategory: ${data.category}\nAddresses: ${data.size}`;
      default:
        return `📢 ChainTrail Event: ${event}\n${JSON.stringify(data, null, 2)}`;
    }
  }

  private formatDiscordEmbed(event: WebhookEvent, data: any): object {
    const colors: Record<string, number> = {
      address_hit: 0xff4444,
      high_risk_trace: 0xff8800,
      cluster_flagged: 0xcc0000,
      new_threat_intel: 0x8800cc,
    };

    return {
      title: `🚨 ChainTrail: ${event.replace(/_/g, ' ').toUpperCase()}`,
      color: colors[event] || 0x3b82f6,
      fields: Object.entries(data).map(([key, value]) => ({
        name: key,
        value: String(value).slice(0, 100),
        inline: true,
      })),
      timestamp: new Date().toISOString(),
      footer: { text: 'ChainTrail v0.1.0' },
    };
  }

  private async getActiveWebhooks(event: WebhookEvent): Promise<WebhookConfig[]> {
    try {
      const { rows } = await this.db.query(`
        SELECT * FROM webhooks WHERE active = true AND $1 = ANY(events)
      `, [event]);
      return rows;
    } catch {
      return []; // table might not exist yet
    }
  }

  private async logDelivery(webhookId: string, event: string, status: string, error?: string): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO webhook_deliveries (webhook_id, event, status, error, delivered_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [webhookId, event, status, error || null]);
    } catch {
      // ignore logging errors
    }
  }
}
