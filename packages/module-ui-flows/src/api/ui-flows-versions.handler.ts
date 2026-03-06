import { NextRequest } from 'next/server';
import { eq, asc, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { uiFlowVersions } from '../schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const numId = parseInt(id, 10);
  const listParams = parseListParams(request);

  const orderCol = (uiFlowVersions as any)[listParams.sort] ?? uiFlowVersions.version;
  const orderFn = listParams.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const condition = eq(uiFlowVersions.uiFlowId, numId);

  const [data, countResult] = await Promise.all([
    db.select().from(uiFlowVersions)
      .where(condition)
      .orderBy(orderFn)
      .limit(listParams.limit)
      .offset(listParams.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(uiFlowVersions).where(condition),
  ]);

  return listResponse(data, 'ui-flow-versions', listParams, countResult[0].count);
}
