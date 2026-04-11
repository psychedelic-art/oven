import type { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and, gte, lte } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { aiUsageLogs } from '../schema';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/ai-usage-logs (F-05-02).
// Keep this array explicit — do NOT reach for Object.keys(aiUsageLogs).
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'providerId',
  'modelId',
  'toolName',
  'inputTokens',
  'outputTokens',
  'totalTokens',
  'costCents',
  'latencyMs',
  'status',
  'createdAt',
] as const;

// GET /api/ai-usage-logs — List usage logs (read-only)
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(aiUsageLogs, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

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
