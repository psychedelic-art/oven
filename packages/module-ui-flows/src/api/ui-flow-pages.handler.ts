import { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { uiFlowPages } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (uiFlowPages as any)[params.sort] ?? uiFlowPages.position;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions = [];
  if (params.filter.uiFlowId) {
    conditions.push(eq(uiFlowPages.uiFlowId, parseInt(params.filter.uiFlowId as string, 10)));
  }
  if (params.filter.tenantId) {
    conditions.push(eq(uiFlowPages.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.pageType) {
    conditions.push(eq(uiFlowPages.pageType, params.filter.pageType as string));
  }

  let query = db.select().from(uiFlowPages).orderBy(orderFn);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(uiFlowPages);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'ui-flow-pages', params, countResult[0].count);
}
