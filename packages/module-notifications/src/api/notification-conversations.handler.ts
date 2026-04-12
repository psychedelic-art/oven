import { type NextRequest } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { notificationConversations } from '../schema';

// GET /api/notification-conversations
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const conditions: unknown[] = [];
  if (params.filter.tenantId) {
    conditions.push(
      eq(notificationConversations.tenantId, parseInt(params.filter.tenantId as string, 10)),
    );
  }
  if (params.filter.channelType) {
    conditions.push(
      eq(notificationConversations.channelType, params.filter.channelType as string),
    );
  }
  if (params.filter.status) {
    conditions.push(
      eq(notificationConversations.status, params.filter.status as string),
    );
  }

  const orderFn = params.order === 'desc'
    ? desc(notificationConversations.id)
    : asc(notificationConversations.id);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(notificationConversations)
      .where(where)
      .orderBy(orderFn)
      .limit(params.limit)
      .offset(params.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationConversations)
      .where(where),
  ]);

  return listResponse(rows, 'notification-conversations', params, countResult[0].count);
}
