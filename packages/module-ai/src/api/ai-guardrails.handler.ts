import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiGuardrails } from '../schema';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/ai-guardrails (F-05-02).
// Keep this array explicit — do NOT reach for Object.keys(aiGuardrails).
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'name',
  'ruleType',
  'scope',
  'action',
  'priority',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

// GET /api/ai-guardrails — List guardrails
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(aiGuardrails, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(aiGuardrails.name, `%${params.filter.q}%`));
  }
  if (params.filter.ruleType) {
    conditions.push(eq(aiGuardrails.ruleType, params.filter.ruleType as string));
  }
  if (params.filter.scope) {
    conditions.push(eq(aiGuardrails.scope, params.filter.scope as string));
  }
  if (params.filter.action) {
    conditions.push(eq(aiGuardrails.action, params.filter.action as string));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(aiGuardrails.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }
  if (params.filter.tenantId) {
    conditions.push(eq(aiGuardrails.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(aiGuardrails).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiGuardrails).where(where),
  ]);

  return listResponse(data, 'ai-guardrails', params, countResult[0].count);
}

// POST /api/ai-guardrails — Create guardrail
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(aiGuardrails).values(body).returning();

  eventBus.emit('ai.guardrail.created', {
    id: result.id,
    name: result.name,
    ruleType: result.ruleType,
    scope: result.scope,
    action: result.action,
  });

  return NextResponse.json(result, { status: 201 });
}
