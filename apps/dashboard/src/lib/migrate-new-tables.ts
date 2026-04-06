import 'dotenv/config';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  console.log('Running new tables migration...');

  const sqlFile = readFileSync(resolve(__dirname, '../../drizzle/new-tables-only.sql'), 'utf8');

  // Split by semicolons and execute each statement
  const statements = sqlFile
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let created = 0;
  let skipped = 0;

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
      created++;
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('already exists')) {
        skipped++;
      } else {
        console.error(`Failed: ${stmt.slice(0, 80)}...`);
        console.error((err as Error).message);
      }
    }
  }

  console.log(`Migration complete: ${created} statements executed, ${skipped} skipped (already exist)`);
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
