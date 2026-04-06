import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentEvalDefinitions } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.workflowId) conditions.push(eq(agentEvalDefinitions.workflowId, Number(params.filter.workflowId)));
  if (params.filter?.tenantId) conditions.push(eq(agentEvalDefinitions.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.evalType) conditions.push(eq(agentEvalDefinitions.evalType, String(params.filter.evalType)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentEvalDefinitions).where(where).orderBy(desc(agentEvalDefinitions.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentEvalDefinitions).where(where),
  ]);
  return listResponse(rows, 'agent-eval-definitions', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.name) return badRequest('Missing name');
  if (!body.evalType) return badRequest('Missing evalType');
  if (!body.config) return badRequest('Missing config');
  const [created] = await db.insert(agentEvalDefinitions).values({
    tenantId: body.tenantId ? Number(body.tenantId) : null,
    workflowId: body.workflowId ? Number(body.workflowId) : null,
    name: body.name,
    evalType: body.evalType,
    config: body.config,
    enabled: body.enabled ?? true,
  }).returning();
  return NextResponse.json(created, { status: 201 });
}
