import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agentWorkflows } from '../schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(agentWorkflows.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.status) conditions.push(eq(agentWorkflows.status, String(params.filter.status)));
  if (params.filter?.agentId) conditions.push(eq(agentWorkflows.agentId, Number(params.filter.agentId)));
  if (params.filter?.q) conditions.push(ilike(agentWorkflows.name, `%${String(params.filter.q)}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentWorkflows).where(where).orderBy(desc(agentWorkflows.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentWorkflows).where(where),
  ]);
  return listResponse(rows, 'agent-workflows', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.name) return badRequest('Missing required field: name');
  if (!body.definition) return badRequest('Missing required field: definition');
  const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const [created] = await db.insert(agentWorkflows).values({
    tenantId: body.tenantId ? Number(body.tenantId) : null,
    name: body.name,
    slug,
    description: body.description ?? null,
    agentId: body.agentId ? Number(body.agentId) : null,
    definition: body.definition,
    agentConfig: body.agentConfig ?? null,
    memoryConfig: body.memoryConfig ?? null,
    status: body.status ?? 'draft',
  }).returning();
  await eventBus.emit('workflow-agents.workflow.created', { id: created.id, name: created.name, slug: created.slug });
  return NextResponse.json(created, { status: 201 });
}
