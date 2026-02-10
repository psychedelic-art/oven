import 'dotenv/config';
import './modules'; // Register modules
import { db } from './db';
import { registry } from '@oven/module-registry';

async function main() {
  console.log('Seeding database...');
  await registry.seedAll(db);
  console.log('Seeding complete!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
