import 'dotenv/config';
import './proxy-bootstrap';
import './modules'; // Register modules
import { db } from './db';
import { registry } from '@oven/module-registry';
import { sql } from 'drizzle-orm';

async function main() {
  // Ensure pgvector extension is installed (required by module-knowledge-base)
  try {
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log('pgvector extension: OK');
  } catch (err) {
    console.warn('pgvector extension could not be created (may require superuser):', (err as Error).message);
  }

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
