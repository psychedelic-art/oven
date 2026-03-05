import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { formComponents } from '../schema';

// GET /api/form-components — List form components with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (formComponents as any)[params.sort] ?? formComponents.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(formComponents).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(formComponents.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.category) {
    conditions.push(eq(formComponents.category, params.filter.category as string));
  }
  if (params.filter.q) {
    conditions.push(ilike(formComponents.name, `%${params.filter.q}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(formComponents);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'form-components', params, countResult[0].count);
}

// POST /api/form-components — Register a new component
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db
    .insert(formComponents)
    .values({
      tenantId: body.tenantId ?? null,
      name: body.name,
      slug: body.slug,
      category: body.category,
      description: body.description ?? null,
      definition: body.definition ?? null,
      defaultProps: body.defaultProps ?? null,
      dataContract: body.dataContract ?? null,
    })
    .returning();

  eventBus.emit('forms.component.registered', {
    id: result.id,
    name: result.name,
    slug: result.slug,
    category: result.category,
  });

  return NextResponse.json(result, { status: 201 });
}
