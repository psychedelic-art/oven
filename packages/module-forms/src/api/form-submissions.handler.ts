import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { formSubmissions } from '../schema';

// GET /api/form-submissions — List form submissions with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (formSubmissions as any)[params.sort] ?? formSubmissions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(formSubmissions).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(formSubmissions.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.formId) {
    conditions.push(eq(formSubmissions.formId, parseInt(params.filter.formId as string, 10)));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(formSubmissions);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'form-submissions', params, countResult[0].count);
}

// POST /api/form-submissions — Create a new submission
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db
    .insert(formSubmissions)
    .values({
      tenantId: body.tenantId,
      formId: body.formId,
      formVersion: body.formVersion ?? null,
      data: body.data ?? null,
      submittedBy: body.submittedBy ?? null,
      metadata: body.metadata ?? null,
    })
    .returning();

  eventBus.emit('forms.submission.created', {
    id: result.id,
    tenantId: result.tenantId,
    formId: result.formId,
    formVersion: result.formVersion,
    submittedBy: result.submittedBy,
  });

  return NextResponse.json(result, { status: 201 });
}
