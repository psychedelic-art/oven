import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentSessions } from '../schema';
import { getOrCreateSession } from '../engine/session-manager';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.agentId) conditions.push(eq(agentSessions.agentId, Number(params.filter.agentId)));
  if (params.filter?.tenantId) conditions.push(eq(agentSessions.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.status) conditions.push(eq(agentSessions.status, String(params.filter.status)));
  if (params.filter?.isPlayground !== undefined) conditions.push(eq(agentSessions.isPlayground, Boolean(params.filter.isPlayground)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentSessions).where(where).orderBy(desc(agentSessions.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentSessions).where(where),
  ]);
  return listResponse(rows, 'agent-sessions', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.agentId) return badRequest('Missing required field: agentId');
  const result = await getOrCreateSession({
    agentId: Number(body.agentId),
    tenantId: body.tenantId ? Number(body.tenantId) : undefined,
    userId: body.userId ? Number(body.userId) : undefined,
    isPlayground: body.isPlayground ?? false,
  });
  return NextResponse.json(result, { status: 201 });
}
