import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { forms } from '../schema';

// GET /api/forms — List forms with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (forms as any)[params.sort] ?? forms.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(forms).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(forms.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.status) {
    conditions.push(eq(forms.status, params.filter.status as string));
  }
  if (params.filter.q) {
    conditions.push(ilike(forms.name, `%${params.filter.q}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(forms);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'forms', params, countResult[0].count);
}

// POST /api/forms — Create a new form
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db
    .insert(forms)
    .values({
      tenantId: body.tenantId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      definition: body.definition ?? null,
      dataLayerConfig: body.dataLayerConfig ?? null,
      businessLayerConfig: body.businessLayerConfig ?? null,
      version: 1,
      status: body.status || 'draft',
      createdBy: body.createdBy ?? null,
    })
    .returning();

  eventBus.emit('forms.form.created', {
    id: result.id,
    tenantId: result.tenantId,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result, { status: 201 });
}
