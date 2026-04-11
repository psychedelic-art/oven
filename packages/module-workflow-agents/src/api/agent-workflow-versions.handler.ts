import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentWorkflowVersions } from '../schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const params = parseListParams(_req);
  const db = getDb();
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentWorkflowVersions).where(eq(agentWorkflowVersions.workflowId, Number(id))).orderBy(desc(agentWorkflowVersions.version)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentWorkflowVersions).where(eq(agentWorkflowVersions.workflowId, Number(id))),
  ]);
  return listResponse(rows, 'agent-workflow-versions', params, Number(count));
}
