import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';
import { drizzle } from 'drizzle-orm/pglite';

/**
 * Creates an in-memory Postgres instance with the pgvector extension
 * available and wraps it in a drizzle client. Used by {@link bootstrapHarness}.
 *
 * Returns the underlying client (needed for close()) alongside the drizzle
 * wrapper which implements the same query-builder surface that production
 * modules talk to via `getDb()` from `@oven/module-registry/db`.
 */
export async function createPgliteDb() {
  const client = await PGlite.create({ extensions: { vector } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = drizzle(client as any);
  return { client, db };
}
