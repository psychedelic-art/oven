import { sql } from 'drizzle-orm';

/**
 * Minimal fixture helpers. They use raw SQL via drizzle.execute rather than
 * importing each module's drizzle schema so the harness stays decoupled
 * from the full module graph — individual e2e tests can pull in whichever
 * schema they actually need.
 */

export interface SeedTenantOpts {
  name?: string;
  slug?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedTenant(db: any, opts: SeedTenantOpts = {}): Promise<{ id: number; slug: string }> {
  const name = opts.name ?? 'Acme Dental';
  const slug = opts.slug ?? 'acme-dental';
  const r = await db.execute(
    sql`INSERT INTO tenants (name, slug) VALUES (${name}, ${slug}) RETURNING id, slug`,
  );
  const row = r.rows[0] as { id: number; slug: string };
  return row;
}

export interface SeedKbEntryOpts {
  tenantId: number;
  knowledgeBaseId: number;
  categoryId: number;
  question: string;
  answer: string;
  keywords?: string[];
  /** 1536-dim vector; omit to skip embedding. */
  embedding?: number[];
  priority?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedKbEntry(db: any, opts: SeedKbEntryOpts): Promise<{ id: number }> {
  const r = await db.execute(sql`
    INSERT INTO kb_entries (
      tenant_id, knowledge_base_id, category_id,
      question, answer, keywords, priority,
      language, enabled, version, metadata
    ) VALUES (
      ${opts.tenantId}, ${opts.knowledgeBaseId}, ${opts.categoryId},
      ${opts.question}, ${opts.answer},
      ${JSON.stringify(opts.keywords ?? [])}::jsonb,
      ${opts.priority ?? 0},
      'es', true, 1, ${JSON.stringify({ embeddingStatus: 'pending' })}::jsonb
    ) RETURNING id
  `);
  const { id } = r.rows[0] as { id: number };

  if (opts.embedding) {
    if (opts.embedding.length !== 1536) {
      throw new Error(`seedKbEntry: embedding must be 1536-dim, got ${opts.embedding.length}`);
    }
    const literal = `[${opts.embedding.join(',')}]`;
    await db.execute(
      sql`UPDATE kb_entries SET embedding = ${literal}::vector WHERE id = ${id}`,
    );
  }

  return { id };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedKnowledgeBaseRow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  opts: { tenantId: number; slug?: string; name?: string },
): Promise<{ id: number }> {
  const slug = opts.slug ?? 'default-kb';
  const name = opts.name ?? 'Default KB';
  const r = await db.execute(sql`
    INSERT INTO kb_knowledge_bases (tenant_id, name, slug, enabled)
    VALUES (${opts.tenantId}, ${name}, ${slug}, true)
    RETURNING id
  `);
  return r.rows[0] as { id: number };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedKbCategory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  opts: { tenantId: number; knowledgeBaseId: number; slug?: string; name?: string },
): Promise<{ id: number }> {
  const slug = opts.slug ?? 'general';
  const name = opts.name ?? 'General';
  const r = await db.execute(sql`
    INSERT INTO kb_categories (tenant_id, knowledge_base_id, name, slug, enabled)
    VALUES (${opts.tenantId}, ${opts.knowledgeBaseId}, ${name}, ${slug}, true)
    RETURNING id
  `);
  return r.rows[0] as { id: number };
}

/** Build a sparse 1536-dim embedding: all zeros with `value` at `dim`. */
export function oneHotEmbedding(dim: number, value = 1): number[] {
  const v = new Array(1536).fill(0);
  v[dim % 1536] = value;
  return v;
}

// ─── Workflow fixtures ──────────────────────────────────────

export interface SeedAgentWorkflowOpts {
  tenantId?: number | null;
  name?: string;
  slug?: string;
  definition: Record<string, unknown>;
  agentConfig?: Record<string, unknown>;
  status?: 'draft' | 'active' | 'archived';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedAgentWorkflow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  opts: SeedAgentWorkflowOpts,
): Promise<{ id: number }> {
  const name = opts.name ?? 'Test workflow';
  const slug = opts.slug ?? `test-workflow-${Date.now()}`;
  const status = opts.status ?? 'active';
  const agentConfig = opts.agentConfig ?? {};
  const r = await db.execute(sql`
    INSERT INTO agent_workflows (
      tenant_id, name, slug, definition, agent_config, status
    ) VALUES (
      ${opts.tenantId ?? null}, ${name}, ${slug},
      ${JSON.stringify(opts.definition)}::jsonb,
      ${JSON.stringify(agentConfig)}::jsonb,
      ${status}
    )
    RETURNING id
  `);
  return r.rows[0] as { id: number };
}

export interface SeedWorkflowExecutionOpts {
  workflowId: number;
  tenantId?: number | null;
  status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  context?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedWorkflowExecution(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  opts: SeedWorkflowExecutionOpts,
): Promise<{ id: number }> {
  const r = await db.execute(sql`
    INSERT INTO agent_workflow_executions (
      workflow_id, tenant_id, status, context
    ) VALUES (
      ${opts.workflowId},
      ${opts.tenantId ?? null},
      ${opts.status ?? 'running'},
      ${JSON.stringify(opts.context ?? {})}::jsonb
    )
    RETURNING id
  `);
  return r.rows[0] as { id: number };
}
