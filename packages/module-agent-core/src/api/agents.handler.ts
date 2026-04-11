import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agents } from '../schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(agents.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.enabled !== undefined) conditions.push(eq(agents.enabled, Boolean(params.filter.enabled)));
  if (params.filter?.q) conditions.push(ilike(agents.name, `%${params.filter.q}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agents).where(where).orderBy(desc(agents.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agents).where(where),
  ]);
  return listResponse(rows, 'agents', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  const { name, slug, description, llmConfig, systemPrompt, exposedParams, toolBindings, inputConfig, tenantId, enabled } = body;
  if (!name) return badRequest('Missing required field: name');
  const agentSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const [created] = await db.insert(agents).values({
    tenantId: tenantId ?? null,
    name, slug: agentSlug, description: description ?? null,
    llmConfig: llmConfig ?? { model: 'fast' },
    systemPrompt: systemPrompt ?? null,
    exposedParams: exposedParams ?? [],
    toolBindings: toolBindings ?? ['*'],
    inputConfig: inputConfig ?? { modalities: ['text'] },
    enabled: enabled ?? true, version: 1,
  }).returning();
  await eventBus.emit('agents.agent.created', { id: created.id, tenantId: created.tenantId, name: created.name, slug: created.slug });
  return NextResponse.json(created, { status: 201 });
}
