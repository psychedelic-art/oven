import 'dotenv/config';
import './modules'; // Register modules
import { db } from './db';
import { registry } from '@oven/module-registry';

async function main() {
  const moduleName = process.argv[2];

  if (moduleName) {
    console.log(`Seeding module: ${moduleName}`);
    await registry.seedModule(db, moduleName);
    console.log(`Seeding "${moduleName}" complete!`);
  } else {
    console.log('Seeding all modules...');
    await registry.seedAll(db);
    console.log('Seeding complete!');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
