import { type NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiBudgets } from '../schema';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/ai-budgets (F-05-02).
// Keep this array explicit — do NOT reach for Object.keys(aiBudgets).
const ALLOWED_SORTS = [
  'id',
  'scope',
  'scopeId',
  'periodType',
  'tokenLimit',
  'costLimitCents',
  'currentTokens',
  'currentCostCents',
  'alertThresholdPct',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

// GET /api/ai-budgets — List budgets
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(aiBudgets, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

  const conditions: any[] = [];
  if (params.filter.scope) {
    conditions.push(eq(aiBudgets.scope, params.filter.scope as string));
  }
  if (params.filter.scopeId) {
    conditions.push(eq(aiBudgets.scopeId, params.filter.scopeId as string));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(aiBudgets.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(aiBudgets).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiBudgets).where(where),
  ]);

  return listResponse(data, 'ai-budgets', params, countResult[0].count);
}

// POST /api/ai-budgets — Create budget
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(aiBudgets).values(body).returning();

  eventBus.emit('ai.budget.created', {
    id: result.id,
    scope: result.scope,
    scopeId: result.scopeId,
    periodType: result.periodType,
  });

  return NextResponse.json(result, { status: 201 });
}
