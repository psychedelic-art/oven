import type { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { aiBudgetAlerts } from '../schema';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/ai-budget-alerts (F-05-02).
// Keep this array explicit — do NOT reach for Object.keys(aiBudgetAlerts).
const ALLOWED_SORTS = [
  'id',
  'budgetId',
  'type',
  'acknowledged',
  'createdAt',
] as const;

// GET /api/ai-budget-alerts — List budget alerts (read-only)
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(aiBudgetAlerts, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

  const conditions: any[] = [];
  if (params.filter.budgetId) {
    conditions.push(eq(aiBudgetAlerts.budgetId, parseInt(params.filter.budgetId as string, 10)));
  }
  if (params.filter.type) {
    conditions.push(eq(aiBudgetAlerts.type, params.filter.type as string));
  }
  if (params.filter.acknowledged !== undefined) {
    conditions.push(eq(aiBudgetAlerts.acknowledged, params.filter.acknowledged === 'true' || params.filter.acknowledged === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(aiBudgetAlerts).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiBudgetAlerts).where(where),
  ]);

  return listResponse(data, 'ai-budget-alerts', params, countResult[0].count);
}
