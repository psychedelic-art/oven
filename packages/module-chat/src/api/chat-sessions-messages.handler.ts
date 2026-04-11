import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatSessions, chatMessages } from '../schema';
import { recordUserMessage, recordAssistantMessage } from '../engine/message-processor';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const params = parseListParams(_req);
  const db = getDb();

  // Verify session exists
  const sessions = await db.select().from(chatSessions).where(eq(chatSessions.id, Number(id)));
  if (sessions.length === 0) return notFound('Session not found');

  const conditions = [eq(chatMessages.sessionId, Number(id))];
  if (params.filter?.role) conditions.push(eq(chatMessages.role, String(params.filter.role)));
  const where = and(...conditions);

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatMessages).where(where).orderBy(desc(chatMessages.createdAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatMessages).where(where),
  ]);
  return listResponse(rows, 'chat-messages', params, Number(count));
}

export async function POST(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();

  if (!body.content) return badRequest('Missing required field: content');

  // Verify session exists and is active
  const sessions = await db.select().from(chatSessions).where(eq(chatSessions.id, Number(id)));
  if (sessions.length === 0) return notFound('Session not found');
  if (sessions[0].status !== 'active') return badRequest('Session is not active');

  // Normalize content to MessageContentPart[]
  const content = typeof body.content === 'string'
    ? [{ type: 'text' as const, text: body.content }]
    : body.content;

  // Record user message
  const messageId = await recordUserMessage({
    sessionId: Number(id),
    content,
    metadata: body.metadata,
  });

  // TODO: Sprint 4A.4 — invoke agent via message-processor pipeline
  // For now, just return the recorded message ID
  return NextResponse.json({ id: messageId, sessionId: Number(id), role: 'user' }, { status: 201 });
}
