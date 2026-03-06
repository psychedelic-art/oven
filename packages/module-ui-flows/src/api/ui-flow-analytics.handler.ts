import { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { uiFlowAnalytics } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (uiFlowAnalytics as any)[params.sort] ?? uiFlowAnalytics.createdAt;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(uiFlowAnalytics.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.uiFlowId) {
    conditions.push(eq(uiFlowAnalytics.uiFlowId, parseInt(params.filter.uiFlowId as string, 10)));
  }
  if (params.filter.eventType) {
    conditions.push(eq(uiFlowAnalytics.eventType, params.filter.eventType as string));
  }
  if (params.filter.pageSlug) {
    conditions.push(eq(uiFlowAnalytics.pageSlug, params.filter.pageSlug as string));
  }

  let query = db.select().from(uiFlowAnalytics).orderBy(orderFn);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(uiFlowAnalytics);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'ui-flow-analytics', params, countResult[0].count);
}
