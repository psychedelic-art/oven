import { type NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiPlaygroundExecutions } from '../schema';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/ai-playground-executions.
// Keep this array explicit — do NOT reach for Object.keys(aiPlaygroundExecutions)
// since that would silently expand the allowlist as the schema grows.
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'type',
  'model',
  'status',
  'latencyMs',
  'costCents',
  'createdAt',
] as const;

// GET /api/ai-playground-executions — List playground executions
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(aiPlaygroundExecutions, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

  const conditions: any[] = [];
  if (params.filter.type) {
    conditions.push(eq(aiPlaygroundExecutions.type, params.filter.type as string));
  }
  if (params.filter.status) {
    conditions.push(eq(aiPlaygroundExecutions.status, params.filter.status as string));
  }
  if (params.filter.model) {
    conditions.push(eq(aiPlaygroundExecutions.model, params.filter.model as string));
  }
  if (params.filter.q) {
    // Search across input JSONB (prompt/text fields) and model
    const searchTerm = `%${(params.filter.q as string).toLowerCase()}%`;
    conditions.push(
      sql`(LOWER(${aiPlaygroundExecutions.input}::text) LIKE ${searchTerm} OR LOWER(${aiPlaygroundExecutions.model}) LIKE ${searchTerm})`
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(aiPlaygroundExecutions).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiPlaygroundExecutions).where(where),
  ]);

  return listResponse(data, 'ai-playground-executions', params, countResult[0].count);
}

// POST /api/ai-playground-executions — Create execution record
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(aiPlaygroundExecutions).values(body).returning();

  eventBus.emit('ai.playground.executed', {
    id: result.id,
    type: result.type,
    model: result.model,
    status: result.status,
    latencyMs: result.latencyMs,
  });

  return NextResponse.json(result, { status: 201 });
}
