import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { flowComments } from '../schema';

// GET /api/flow-items/[id]/comments — List comments for a flow item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const listParams = parseListParams(request);
  const flowItemId = parseInt(id, 10);

  const orderCol = (flowComments as any)[listParams.sort] ?? flowComments.id;
  const orderFn = listParams.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions = [eq(flowComments.flowItemId, flowItemId)];

  let query = db.select().from(flowComments).where(and(...conditions)).orderBy(orderFn);

  let countQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(flowComments)
    .where(and(...conditions));

  const [data, countResult] = await Promise.all([
    query.limit(listParams.limit).offset(listParams.offset),
    countQuery,
  ]);

  return listResponse(data, 'flow-comments', listParams, countResult[0].count);
}

// POST /api/flow-items/[id]/comments — Add a comment to a flow item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  const flowItemId = parseInt(id, 10);

  const { stageId, authorId, content, type, parentId } = body;

  const [result] = await db
    .insert(flowComments)
    .values({
      flowItemId,
      stageId: stageId ?? null,
      authorId,
      content,
      type: type ?? 'comment',
      parentId: parentId ?? null,
    })
    .returning();

  eventBus.emit('flows.comment.created', {
    id: result.id,
    flowItemId: result.flowItemId,
    authorId: result.authorId,
    type: result.type,
  });

  return NextResponse.json(result, { status: 201 });
}
