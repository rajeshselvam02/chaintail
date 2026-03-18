import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { EntityImporter } from './importer';
import { EntityLookup } from './lookup';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export { EntityImporter } from './importer';
export { EntityLookup } from './lookup';
export { KNOWN_ENTITIES } from './known-entities';

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'chaintail',
  password: process.env.DB_PASSWORD || 'chaintail',
  database: process.env.DB_NAME || 'chaintail',
});

if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    if (command === 'seed') {
      const importer = new EntityImporter(db);
      const stats = await importer.importAll();
      console.log(`\n📊 Entity Import Summary`);
      console.log(`${'─'.repeat(40)}`);
      console.log(`Entities imported:  ${stats.entitiesImported}`);
      console.log(`Addresses imported: ${stats.addressesImported}`);
      console.log(`Skipped:            ${stats.skipped}`);
    }

    if (command === 'lookup') {
      const address = process.argv[3];
      if (!address) { console.log('Usage: npm run dev lookup <address>'); process.exit(1); }
      const lookup = new EntityLookup(db);
      const result = await lookup.lookupAddress(address);
      if (result) {
        console.log('\n🏷  Entity Found:');
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log('❌ No entity found for this address');
      }
    }

    if (command === 'stats') {
      const lookup = new EntityLookup(db);
      const stats = await lookup.getStats();
      console.log('\n📊 Entity Database Stats:');
      console.log(JSON.stringify(stats, null, 2));
    }

    await db.end();
  })();
}
