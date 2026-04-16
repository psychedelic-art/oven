import { sql } from 'drizzle-orm';
import { setDb } from '@oven/module-registry';
import { createPgliteDb } from './pglite-driver';

export interface HarnessHandle {
  /** Drizzle client wrapping the in-memory pglite. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  /** Close the underlying pglite; also nulls the global `getDb()` binding. */
  cleanup: () => Promise<void>;
}

/**
 * Schema sets the harness knows how to create. Each set maps to a subset of
 * production tables needed by a given e2e flow. Keeping this narrow avoids
 * the combinatorial complexity of running every module's drizzle schema in
 * pglite.
 *
 * Extend this enum as new e2e specs need new tables.
 */
export type SchemaSet = 'knowledge-base' | 'workflow-agents';

export interface BootstrapOptions {
  /** Which table groups to create. Defaults to all. */
  schemas?: SchemaSet[];
  /** When true, skip seed runs (useful for tests that want a bare schema). */
  skipSeed?: boolean;
}

/**
 * Bootstraps an in-process test database:
 *   1. Spins up pglite (with pgvector extension loaded).
 *   2. Calls `setDb()` on `@oven/module-registry` so module code that
 *      reaches for `getDb()` finds the in-memory instance.
 *   3. Creates the requested schemas via raw DDL (matches production
 *      drizzle schemas column-for-column — see schemas.ts).
 *
 * Production seeds are deliberately NOT run here; tests call the specific
 * seed(s) they want (e.g. `seedKnowledgeBase(db)`) so we can exercise
 * `CREATE EXTENSION` / HNSW index paths exactly as production would.
 */
export async function bootstrapHarness(opts: BootstrapOptions = {}): Promise<HarnessHandle> {
  const { schemas = ['knowledge-base'] } = opts;

  const { client, db } = await createPgliteDb();
  setDb(db);

  // pgvector must exist before any table with a `vector(N)` column is
  // created. The same guarantee the production `seedKnowledgeBase()` now
  // provides (see packages/module-knowledge-base/src/seed.ts, fixed in
  // cycle-39). We run it here so tests that exercise the schema outside
  // of seedKnowledgeBase (e.g. manually-seeded kb_entries) still work.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);

  if (schemas.includes('knowledge-base')) {
    await createKnowledgeBaseSchema(db);
  }

  if (schemas.includes('workflow-agents')) {
    await createWorkflowAgentsSchema(db);
  }

  const cleanup = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setDb(null as any);
    await client.close();
  };

  return { db, cleanup };
}

/**
 * Raw DDL that mirrors the drizzle-defined tables in:
 *  - `@oven/module-tenants/schema` (tenants)
 *  - `@oven/module-roles/schema` (permissions, api_endpoint_permissions)
 *  - `@oven/module-knowledge-base/schema` (kb_knowledge_bases, kb_categories,
 *    kb_entries, kb_entry_versions) + the raw-SQL `embedding vector(1536)`
 *    column and HNSW index.
 *
 * The `embedding` column and HNSW index are intentionally NOT created here:
 * they are the responsibility of `seedKnowledgeBase()`, and we want e2e
 * tests to exercise that code path (that's the whole point of the Part A
 * fix verification).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createKnowledgeBaseSchema(db: any): Promise<void> {
  // tenants
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS tenants (
      id serial PRIMARY KEY,
      name varchar(255) NOT NULL,
      slug varchar(128) NOT NULL UNIQUE,
      enabled boolean NOT NULL DEFAULT true,
      metadata jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `));

  // permissions (module-roles)
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS permissions (
      id serial PRIMARY KEY,
      resource varchar(128) NOT NULL,
      action varchar(64) NOT NULL,
      slug varchar(256) NOT NULL UNIQUE,
      description text,
      created_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action)
    );
  `));

  // api_endpoint_permissions (module-roles) — seed.ts step 3 inserts here
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS api_endpoint_permissions (
      id serial PRIMARY KEY,
      module varchar(64) NOT NULL,
      route varchar(256) NOT NULL,
      method varchar(16) NOT NULL,
      permission_id integer,
      is_public boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT api_endpoint_permissions_unique UNIQUE (module, route, method)
    );
  `));

  // kb_knowledge_bases
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS kb_knowledge_bases (
      id serial PRIMARY KEY,
      tenant_id integer NOT NULL,
      name varchar(255) NOT NULL,
      slug varchar(128) NOT NULL,
      description text,
      enabled boolean NOT NULL DEFAULT true,
      metadata jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT kbkb_tenant_slug UNIQUE (tenant_id, slug)
    );
  `));

  // kb_categories
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS kb_categories (
      id serial PRIMARY KEY,
      tenant_id integer NOT NULL,
      knowledge_base_id integer NOT NULL,
      name varchar(255) NOT NULL,
      slug varchar(128) NOT NULL,
      description text,
      icon varchar(50),
      "order" integer NOT NULL DEFAULT 0,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now(),
      CONSTRAINT kbc_tenant_kb_slug UNIQUE (tenant_id, knowledge_base_id, slug)
    );
  `));

  // kb_entries (WITHOUT the embedding column — that's the seed's job)
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS kb_entries (
      id serial PRIMARY KEY,
      tenant_id integer NOT NULL,
      knowledge_base_id integer NOT NULL,
      category_id integer NOT NULL,
      question text NOT NULL,
      answer text NOT NULL,
      keywords jsonb,
      tags jsonb,
      priority integer NOT NULL DEFAULT 0,
      language varchar(10) NOT NULL DEFAULT 'es',
      enabled boolean NOT NULL DEFAULT true,
      version integer NOT NULL DEFAULT 1,
      metadata jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `));
}

/**
 * Raw DDL mirroring `@oven/module-workflow-agents/schema`. Covers the
 * tables needed by the workflow engine's real code paths:
 *  - agent_workflows (definition source)
 *  - agent_workflow_executions (status + context + checkpoint)
 *  - agent_workflow_node_executions (per-node audit trail)
 *
 * Other tables (versions, memory, mcp_server_definitions, guardrail
 * bindings, eval_*) are intentionally omitted — no e2e spec writes to
 * them and pglite doesn't benefit from speculative schema creation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createWorkflowAgentsSchema(db: any): Promise<void> {
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS agent_workflows (
      id serial PRIMARY KEY,
      tenant_id integer,
      name varchar(255) NOT NULL,
      slug varchar(128) NOT NULL,
      description text,
      agent_id integer,
      definition jsonb NOT NULL,
      agent_config jsonb,
      memory_config jsonb,
      status varchar(32) NOT NULL DEFAULT 'draft',
      version integer NOT NULL DEFAULT 1,
      category varchar(64),
      tags jsonb,
      is_template boolean NOT NULL DEFAULT false,
      cloned_from integer,
      template_slug varchar(128),
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS agent_workflow_executions (
      id serial PRIMARY KEY,
      workflow_id integer NOT NULL,
      tenant_id integer,
      status varchar(32) NOT NULL DEFAULT 'pending',
      trigger_source varchar(128),
      trigger_payload jsonb,
      context jsonb NOT NULL DEFAULT '{}'::jsonb,
      current_state varchar(128),
      checkpoint jsonb,
      steps_executed integer NOT NULL DEFAULT 0,
      started_at timestamp NOT NULL DEFAULT now(),
      completed_at timestamp,
      error text
    );
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS agent_workflow_node_executions (
      id serial PRIMARY KEY,
      execution_id integer NOT NULL,
      node_id varchar(128) NOT NULL,
      node_type varchar(64) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'pending',
      input jsonb,
      output jsonb,
      error text,
      started_at timestamp NOT NULL DEFAULT now(),
      completed_at timestamp,
      duration_ms integer
    );
  `));
}
