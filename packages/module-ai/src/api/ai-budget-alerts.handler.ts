import type { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { aiBudgetAlerts } from '../schema';

// GET /api/ai-budget-alerts — List budget alerts (read-only)
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (aiBudgetAlerts as any)[params.sort] ?? aiBudgetAlerts.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

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
