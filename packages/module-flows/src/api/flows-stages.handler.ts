import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { flowStages } from '../schema';

// GET /api/flows/[id]/stages — List stages for a flow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const listParams = parseListParams(request);
  const flowId = parseInt(id, 10);

  const orderCol = (flowStages as any)[listParams.sort] ?? flowStages.order;
  const orderFn = listParams.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions = [eq(flowStages.flowId, flowId)];

  let query = db.select().from(flowStages).where(and(...conditions)).orderBy(orderFn);

  let countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(flowStages)
    .where(and(...conditions));

  const [data, countResult] = await Promise.all([
    query.limit(listParams.limit).offset(listParams.offset),
    countQuery,
  ]);

  return listResponse(data, 'flow-stages', listParams, countResult[0].count);
}
