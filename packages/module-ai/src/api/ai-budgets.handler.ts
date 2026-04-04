import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiBudgets } from '../schema';

// GET /api/ai-budgets — List budgets
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (aiBudgets as any)[params.sort] ?? aiBudgets.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

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
