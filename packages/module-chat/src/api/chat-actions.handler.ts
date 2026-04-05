import type { NextRequest } from 'next/server';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatActions } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.sessionId) conditions.push(eq(chatActions.sessionId, Number(params.filter.sessionId)));
  if (params.filter?.messageId) conditions.push(eq(chatActions.messageId, Number(params.filter.messageId)));
  if (params.filter?.toolName) conditions.push(eq(chatActions.toolName, String(params.filter.toolName)));
  if (params.filter?.status) conditions.push(eq(chatActions.status, String(params.filter.status)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatActions).where(where).orderBy(desc(chatActions.createdAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatActions).where(where),
  ]);
  return listResponse(rows, 'chat-actions', params, Number(count));
}
