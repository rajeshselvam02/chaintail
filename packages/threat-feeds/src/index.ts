import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { FeedImporter } from './importer';
import { OFACSync } from './ofac';
import { WebhookEngine } from './webhooks';
import { AddressWatcher } from './address-watcher';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export { FeedImporter } from './importer';
export { WebhookEngine } from './webhooks';
export { AddressWatcher } from './address-watcher';

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'chaintail',
  password: process.env.DB_PASSWORD || 'chaintail',
  database: process.env.DB_NAME || 'chaintail',
});

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    if (command === 'watch') {
      const address = args[1];
      const label = args.slice(2).join(' ');
      if (!address) {
        console.log('Usage: npm run sync -- watch <address> [label]');
        process.exit(1);
      }
      const webhooks = new WebhookEngine(db);
      const watcher = new AddressWatcher(db, webhooks);
      await watcher.load();
      await watcher.watch(address, label || address);
      console.log(`✅ Now watching: ${address}`);
      await db.end();
      return;
    }

    if (command === 'test-webhook') {
      const url = args[1];
      if (!url) { console.log('Usage: npm run sync -- test-webhook <url>'); process.exit(1); }
      const webhooks = new WebhookEngine(db);
      await webhooks.send('address_hit', { address: 'bc1qtest...', txid: 'abc123test...', test: true });
      console.log('✅ Test webhook sent');
      await db.end();
      return;
    }

    if (command === 'ofac') {
      const ofac = new OFACSync(db);
      const result = await ofac.sync();
      console.log('OFAC sync done:', result);
      await db.end();
      return;
    }

    // Default: sync feeds
    const importer = new FeedImporter(db);
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║     ChainTrail Threat Intel Sync             ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // Also sync OFAC
    const ofac = new OFACSync(db);
    await ofac.sync();

    const results = await importer.importAll();

    console.log('\n📊 Import Summary');
    console.log('─'.repeat(48));
    let totalImported = 0;
    for (const r of results) {
      console.log(`${r.source.slice(0, 30).padEnd(32)} +${r.imported} (${r.skipped} skipped)`);
      totalImported += r.imported;
    }
    console.log('─'.repeat(48));
    console.log(`Total imported: ${totalImported}\n`);

    for (const r of results) {
      await db.query(`
        INSERT INTO feed_sync_log (source, imported, skipped, errors)
        VALUES ($1, $2, $3, $4)
      `, [r.source, r.imported, r.skipped, r.errors]).catch(() => {});
    }

    await db.end();
  })();
}
// OFAC export
export { OFACSync } from './ofac';
