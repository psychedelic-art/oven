import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentWorkflowExecutions } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.workflowId) conditions.push(eq(agentWorkflowExecutions.workflowId, Number(params.filter.workflowId)));
  if (params.filter?.status) conditions.push(eq(agentWorkflowExecutions.status, String(params.filter.status)));
  if (params.filter?.tenantId) conditions.push(eq(agentWorkflowExecutions.tenantId, Number(params.filter.tenantId)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentWorkflowExecutions).where(where).orderBy(desc(agentWorkflowExecutions.startedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentWorkflowExecutions).where(where),
  ]);
  return listResponse(rows, 'agent-workflow-executions', params, Number(count));
}
