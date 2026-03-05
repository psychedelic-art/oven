import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { flowVersions } from '../schema';

// GET /api/flow-versions — List flow versions (flowId filter required)
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  if (!params.filter.flowId) {
    return badRequest('flowId filter is required');
  }

  const flowId = parseInt(params.filter.flowId as string, 10);

  const orderCol = (flowVersions as any)[params.sort] ?? flowVersions.version;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions = [eq(flowVersions.flowId, flowId)];

  let query = db.select().from(flowVersions).where(and(...conditions)).orderBy(orderFn);

  let countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(flowVersions)
    .where(and(...conditions));

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'flow-versions', params, countResult[0].count);
}
