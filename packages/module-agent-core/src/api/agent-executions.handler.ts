import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentExecutions } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.agentId) conditions.push(eq(agentExecutions.agentId, Number(params.filter.agentId)));
  if (params.filter?.sessionId) conditions.push(eq(agentExecutions.sessionId, Number(params.filter.sessionId)));
  if (params.filter?.status) conditions.push(eq(agentExecutions.status, String(params.filter.status)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentExecutions).where(where).orderBy(desc(agentExecutions.startedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentExecutions).where(where),
  ]);
  return listResponse(rows, 'agent-executions', params, Number(count));
}
