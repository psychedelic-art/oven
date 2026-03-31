import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { formDataSources } from '../schema';

// GET /api/form-data-sources — List form data sources with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (formDataSources as any)[params.sort] ?? formDataSources.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(formDataSources).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(formDataSources.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.formId) {
    conditions.push(eq(formDataSources.formId, parseInt(params.filter.formId as string, 10)));
  }
  if (params.filter.type) {
    conditions.push(eq(formDataSources.type, params.filter.type as string));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(formDataSources);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'form-data-sources', params, countResult[0].count);
}

// POST /api/form-data-sources — Create a new data source
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db
    .insert(formDataSources)
    .values({
      tenantId: body.tenantId ?? null,
      name: body.name,
      slug: body.slug,
      formId: body.formId ?? null,
      type: body.type,
      config: body.config ?? null,
      outputSchema: body.outputSchema ?? null,
      cachingPolicy: body.cachingPolicy || 'none',
      ttlSeconds: body.ttlSeconds ?? null,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
