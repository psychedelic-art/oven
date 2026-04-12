import type { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { notificationConversations } from '../schema';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();

  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(notificationConversations.tenantId, Number(params.filter.tenantId)));
  }
  if (params.filter.channelType) {
    conditions.push(eq(notificationConversations.channelType, String(params.filter.channelType)));
  }
  if (params.filter.status) {
    conditions.push(eq(notificationConversations.status, String(params.filter.status)));
  }
  if (params.filter.channelId) {
    conditions.push(eq(notificationConversations.channelId, Number(params.filter.channelId)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderCol =
    params.sort === 'status'
      ? notificationConversations.status
      : params.sort === 'createdAt'
        ? notificationConversations.createdAt
        : notificationConversations.id;
  const orderFn = params.order === 'desc' ? desc : asc;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(notificationConversations)
      .where(where)
      .orderBy(orderFn(orderCol))
      .limit(params.limit)
      .offset(params.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationConversations)
      .where(where),
  ]);

  return listResponse(data, 'notification-conversations', params, countResult[0].count);
}
