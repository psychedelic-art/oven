import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatFeedback } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.sessionId) conditions.push(eq(chatFeedback.sessionId, Number(params.filter.sessionId)));
  if (params.filter?.rating) conditions.push(eq(chatFeedback.rating, String(params.filter.rating)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatFeedback).where(where).orderBy(desc(chatFeedback.createdAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatFeedback).where(where),
  ]);
  return listResponse(rows, 'chat-feedback', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.sessionId) return badRequest('Missing required field: sessionId');
  if (!body.messageId) return badRequest('Missing required field: messageId');
  if (!body.rating || !['positive', 'negative'].includes(body.rating)) {
    return badRequest('Missing or invalid field: rating (must be "positive" or "negative")');
  }
  const [created] = await db.insert(chatFeedback).values({
    sessionId: Number(body.sessionId),
    messageId: Number(body.messageId),
    userId: body.userId ? Number(body.userId) : null,
    rating: body.rating,
    comment: body.comment ?? null,
  }).returning();
  await eventBus.emit('chat.feedback.submitted', {
    sessionId: created.sessionId,
    messageId: created.messageId,
    rating: created.rating,
  });
  return NextResponse.json(created, { status: 201 });
}
