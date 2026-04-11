import type { NextRequest } from 'next/server';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentEvalRuns } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.evalDefinitionId) conditions.push(eq(agentEvalRuns.evalDefinitionId, Number(params.filter.evalDefinitionId)));
  if (params.filter?.executionId) conditions.push(eq(agentEvalRuns.executionId, Number(params.filter.executionId)));
  if (params.filter?.passed !== undefined) conditions.push(eq(agentEvalRuns.passed, Boolean(params.filter.passed)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentEvalRuns).where(where).orderBy(desc(agentEvalRuns.createdAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentEvalRuns).where(where),
  ]);
  return listResponse(rows, 'agent-eval-runs', params, Number(count));
}
