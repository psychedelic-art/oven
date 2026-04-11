import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agentNodeDefinitions } from '../schema';
import { eq, and, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.category) conditions.push(eq(agentNodeDefinitions.category, String(params.filter.category)));
  if (params.filter?.q) conditions.push(ilike(agentNodeDefinitions.name, `%${params.filter.q}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentNodeDefinitions).where(where).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentNodeDefinitions).where(where),
  ]);
  return listResponse(rows, 'agent-nodes', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.name || !body.category) return badRequest('Missing required fields: name, category');
  const nodeSlug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const [created] = await db.insert(agentNodeDefinitions).values({
    name: body.name, slug: nodeSlug, category: body.category,
    description: body.description ?? null, inputs: body.inputs ?? null,
    outputs: body.outputs ?? null, config: body.config ?? null, isSystem: body.isSystem ?? false,
  }).returning();
  await eventBus.emit('agents.node.created', { id: created.id, name: created.name, category: created.category });
  return NextResponse.json(created, { status: 201 });
}
