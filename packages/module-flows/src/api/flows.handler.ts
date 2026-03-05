import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { flows } from '../schema';

// GET /api/flows — List flow templates with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (flows as any)[params.sort] ?? flows.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(flows).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(flows.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.enabled !== undefined) {
    const enabledVal = params.filter.enabled === 'true' || params.filter.enabled === true;
    conditions.push(eq(flows.enabled, enabledVal as boolean));
  }
  if (params.filter.q) {
    conditions.push(ilike(flows.name, `%${params.filter.q}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(flows);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'flows', params, countResult[0].count);
}

// POST /api/flows — Create a new flow template
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { tenantId, name, slug, description, definition, enabled } = body;

  const [result] = await db
    .insert(flows)
    .values({
      tenantId,
      name,
      slug,
      description,
      definition,
      enabled: enabled ?? true,
    })
    .returning();

  eventBus.emit('flows.flow.created', {
    id: result.id,
    tenantId: result.tenantId,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result, { status: 201 });
}
