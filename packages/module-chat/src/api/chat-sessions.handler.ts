import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatSessions } from '../schema';
import { createSession } from '../engine/session-manager';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(chatSessions.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.agentId) conditions.push(eq(chatSessions.agentId, Number(params.filter.agentId)));
  if (params.filter?.userId) conditions.push(eq(chatSessions.userId, Number(params.filter.userId)));
  if (params.filter?.status) conditions.push(eq(chatSessions.status, String(params.filter.status)));
  if (params.filter?.channel) conditions.push(eq(chatSessions.channel, String(params.filter.channel)));
  if (params.filter?.isPinned !== undefined) conditions.push(eq(chatSessions.isPinned, Boolean(params.filter.isPinned)));
  if (params.filter?.q) conditions.push(ilike(chatSessions.title, `%${String(params.filter.q)}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatSessions).where(where).orderBy(desc(chatSessions.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatSessions).where(where),
  ]);
  return listResponse(rows, 'chat-sessions', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const session = await createSession({
    tenantId: body.tenantId ? Number(body.tenantId) : undefined,
    agentId: body.agentId ? Number(body.agentId) : undefined,
    agentSlug: body.agentSlug,
    userId: body.userId ? Number(body.userId) : undefined,
    channel: body.channel ?? 'web',
    title: body.title,
  });
  return NextResponse.json(session, { status: 201 });
}
