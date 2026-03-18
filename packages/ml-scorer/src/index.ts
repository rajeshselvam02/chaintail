import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { FeatureExtractor } from './features';
import { MLScorer } from './scorer';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export { FeatureExtractor } from './features';
export { MLScorer } from './scorer';

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'chaintail',
  password: process.env.DB_PASSWORD || 'chaintail',
  database: process.env.DB_NAME || 'chaintail',
});

if (require.main === module) {
  const address = process.argv[2];
  if (!address) {
    console.log('Usage: ts-node src/index.ts <btc_address>');
    process.exit(1);
  }

  (async () => {
    const extractor = new FeatureExtractor(db);
    const scorer = new MLScorer();

    console.log(`\n🤖 ML Risk Scoring: ${address}\n`);
    console.log('Extracting features...');
    const features = await extractor.extract(address);

    console.log('\nFeatures:');
    console.log(`  TX count:          ${features.txCount}`);
    console.log(`  Unique senders:    ${features.uniqueSenders}`);
    console.log(`  Unique recipients: ${features.uniqueRecipients}`);
    console.log(`  Hops to bad actor: ${features.hopsToBadActor}`);
    console.log(`  Has threat intel:  ${features.hasThreatIntel}`);
    console.log(`  Is exchange:       ${features.isExchange}`);
    console.log(`  Cluster risk:      ${features.clusterRiskLevel}`);

    const result = scorer.score(features);

    console.log(`\n📊 ML Score Result:`);
    console.log(`${'─'.repeat(40)}`);
    console.log(`Score:       ${result.score}/100`);
    console.log(`Level:       ${result.level.toUpperCase()}`);
    console.log(`Confidence:  ${result.confidence}%`);
    console.log(`Explanation: ${result.explanation}`);

    if (result.factors.length > 0) {
      console.log(`\nRisk Factors:`);
      for (const f of result.factors) {
        console.log(`  [+${f.contribution}] ${f.name}: ${f.description}`);
      }
    }

    // Persist score
    await db.query(`
      INSERT INTO addresses (address, risk_score, labels)
      VALUES ($1, $2, $3)
      ON CONFLICT (address) DO UPDATE SET
        risk_score = $2,
        labels = array_append(addresses.labels, $4)
    `, [address, result.score, [], `ml_scored:${result.level}`]);

    console.log(`\n✅ Score saved to database`);
    await db.end();
  })();
}
