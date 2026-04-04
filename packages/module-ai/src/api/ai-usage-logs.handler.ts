import type { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and, gte, lte } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { aiUsageLogs } from '../schema';

// GET /api/ai-usage-logs — List usage logs (read-only)
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (aiUsageLogs as any)[params.sort] ?? aiUsageLogs.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.tenantId) {
    conditions.push(eq(aiUsageLogs.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.providerId) {
    conditions.push(eq(aiUsageLogs.providerId, parseInt(params.filter.providerId as string, 10)));
  }
  if (params.filter.modelId) {
    conditions.push(eq(aiUsageLogs.modelId, params.filter.modelId as string));
  }
  if (params.filter.startDate) {
    conditions.push(gte(aiUsageLogs.createdAt, new Date(params.filter.startDate as string)));
  }
  if (params.filter.endDate) {
    conditions.push(lte(aiUsageLogs.createdAt, new Date(params.filter.endDate as string)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(aiUsageLogs).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiUsageLogs).where(where),
  ]);

  return listResponse(data, 'ai-usage-logs', params, countResult[0].count);
}
