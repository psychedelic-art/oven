import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { flowReviews } from '../schema';

// GET /api/flow-items/[id]/reviews — List reviews for a flow item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const listParams = parseListParams(request);
  const flowItemId = parseInt(id, 10);

  const orderCol = (flowReviews as any)[listParams.sort] ?? flowReviews.id;
  const orderFn = listParams.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions = [eq(flowReviews.flowItemId, flowItemId)];

  let query = db.select().from(flowReviews).where(and(...conditions)).orderBy(orderFn);

  let countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(flowReviews)
    .where(and(...conditions));

  const [data, countResult] = await Promise.all([
    query.limit(listParams.limit).offset(listParams.offset),
    countQuery,
  ]);

  return listResponse(data, 'flow-reviews', listParams, countResult[0].count);
}

// POST /api/flow-items/[id]/reviews — Submit a review for a flow item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  const flowItemId = parseInt(id, 10);

  const { stageId, reviewerId, decision, summary, score } = body;

  const [result] = await db
    .insert(flowReviews)
    .values({
      flowItemId,
      stageId: stageId ?? null,
      reviewerId,
      decision,
      summary: summary ?? null,
      score: score ?? null,
    })
    .returning();

  eventBus.emit('flows.review.submitted', {
    id: result.id,
    flowItemId: result.flowItemId,
    reviewerId: result.reviewerId,
    decision: result.decision,
  });

  return NextResponse.json(result, { status: 201 });
}
