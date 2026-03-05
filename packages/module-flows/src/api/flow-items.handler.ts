import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { flowItems } from '../schema';

// GET /api/flow-items — List flow items with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (flowItems as any)[params.sort] ?? flowItems.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(flowItems).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(flowItems.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.flowId) {
    conditions.push(eq(flowItems.flowId, parseInt(params.filter.flowId as string, 10)));
  }
  if (params.filter.status) {
    conditions.push(eq(flowItems.status, params.filter.status as string));
  }
  if (params.filter.contentType) {
    conditions.push(eq(flowItems.contentType, params.filter.contentType as string));
  }
  if (params.filter.q) {
    conditions.push(eq(flowItems.contentType, params.filter.q as string));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(flowItems);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'flow-items', params, countResult[0].count);
}

// POST /api/flow-items — Create a new flow item
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { tenantId, flowId, currentStageId, contentType, contentId, contentSnapshot, metadata, assignedTo, createdBy } = body;

  const [result] = await db
    .insert(flowItems)
    .values({
      tenantId,
      flowId,
      currentStageId: currentStageId ?? null,
      contentType,
      contentId: contentId ?? null,
      contentSnapshot: contentSnapshot ?? null,
      metadata: metadata ?? null,
      status: 'active',
      assignedTo: assignedTo ?? null,
      createdBy: createdBy ?? null,
    })
    .returning();

  eventBus.emit('flows.item.created', {
    id: result.id,
    flowId: result.flowId,
    tenantId: result.tenantId,
    contentType: result.contentType,
    contentId: result.contentId,
  });

  return NextResponse.json(result, { status: 201 });
}
