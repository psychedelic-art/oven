import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentGuardrailBindings } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.scopeType) conditions.push(eq(agentGuardrailBindings.scopeType, String(params.filter.scopeType)));
  if (params.filter?.scopeId) conditions.push(eq(agentGuardrailBindings.scopeId, Number(params.filter.scopeId)));
  if (params.filter?.tenantId) conditions.push(eq(agentGuardrailBindings.tenantId, Number(params.filter.tenantId)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentGuardrailBindings).where(where).orderBy(agentGuardrailBindings.priority).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentGuardrailBindings).where(where),
  ]);
  return listResponse(rows, 'agent-guardrail-bindings', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.guardrailId) return badRequest('Missing guardrailId');
  if (!body.scopeType) return badRequest('Missing scopeType');
  if (!body.scopeId) return badRequest('Missing scopeId');
  const [created] = await db.insert(agentGuardrailBindings).values({
    tenantId: body.tenantId ? Number(body.tenantId) : null,
    guardrailId: Number(body.guardrailId),
    scopeType: body.scopeType,
    scopeId: Number(body.scopeId),
    nodeSlug: body.nodeSlug ?? null,
    enabled: body.enabled ?? true,
    priority: body.priority ?? 0,
  }).returning();
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  await db.delete(agentGuardrailBindings).where(eq(agentGuardrailBindings.id, Number(id)));
  return NextResponse.json({ id: Number(id) });
}
