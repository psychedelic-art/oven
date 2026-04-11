import 'dotenv/config';
import './proxy-bootstrap';
import { neon } from '@neondatabase/serverless';

/**
 * Non-destructive index maintenance.
 *
 * Does NOT truncate data. Only reindexes existing tables so Postgres stats and
 * index health are refreshed after large schema / seed changes.
 *
 * Run with:
 *   pnpm --filter @oven/dashboard exec tsx src/lib/reset-indexes.ts
 *   pnpm --filter @oven/dashboard exec tsx src/lib/reset-indexes.ts --table=maps
 *   pnpm --filter @oven/dashboard exec tsx src/lib/reset-indexes.ts --vacuum
 */

const sql = neon(process.env.DATABASE_URL!);

type Args = { table?: string; vacuum: boolean };

function parseArgs(): Args {
  const out: Args = { vacuum: false };
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--table=')) out.table = arg.slice('--table='.length);
    else if (arg === '--vacuum') out.vacuum = true;
  }
  return out;
}

async function listPublicTables(): Promise<string[]> {
  const rows = (await sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `) as Array<{ tablename: string }>;
  return rows.map((r) => r.tablename);
}

// pg_tables names only contain [a-z0-9_]; still validate to make identifier
// interpolation obviously safe.
const SAFE_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertIdent(name: string): void {
  if (!SAFE_IDENT.test(name)) throw new Error(`unsafe identifier: ${name}`);
}

async function reindexTable(table: string): Promise<void> {
  assertIdent(table);
  // neon() returns a tagged-template function; for DDL we use the array form
  // with an empty params list (identifiers cannot be parameterized).
  await sql(`REINDEX TABLE "${table}"`);
  await sql(`ANALYZE "${table}"`);
  console.log(`[reindex] ${table}`);
}

async function vacuumTable(table: string): Promise<void> {
  assertIdent(table);
  await sql(`VACUUM (ANALYZE) "${table}"`);
  console.log(`[vacuum]  ${table}`);
}

async function main() {
  const args = parseArgs();
  const tables = args.table ? [args.table] : await listPublicTables();

  if (tables.length === 0) {
    console.log('No public tables found — did you run db:push first?');
    return;
  }

  console.log(`Reindexing ${tables.length} table(s)...`);
  for (const t of tables) {
    try {
      await reindexTable(t);
      if (args.vacuum) await vacuumTable(t);
    } catch (err) {
      console.warn(`[skip]    ${t}: ${(err as Error).message}`);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('reset-indexes failed:', err);
  process.exit(1);
});
