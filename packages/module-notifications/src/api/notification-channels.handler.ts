import { type NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { notificationChannels } from '../schema';

// GET /api/notification-channels
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const conditions: unknown[] = [];
  if (params.filter.tenantId) {
    conditions.push(
      eq(notificationChannels.tenantId, parseInt(params.filter.tenantId as string, 10)),
    );
  }
  if (params.filter.channelType) {
    conditions.push(
      eq(notificationChannels.channelType, params.filter.channelType as string),
    );
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(
      eq(notificationChannels.enabled, params.filter.enabled === 'true' || params.filter.enabled === true),
    );
  }

  const orderFn = params.order === 'desc'
    ? desc(notificationChannels.id)
    : asc(notificationChannels.id);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(notificationChannels)
      .where(where)
      .orderBy(orderFn)
      .limit(params.limit)
      .offset(params.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationChannels)
      .where(where),
  ]);

  return listResponse(rows, 'notification-channels', params, countResult[0].count);
}

// POST /api/notification-channels
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tenantId, channelType, adapterName, name, config, webhookVerifyToken } = body;

  if (!tenantId || !channelType || !adapterName || !name || !config) {
    return badRequest('Missing required fields: tenantId, channelType, adapterName, name, config');
  }

  const db = getDb();
  const [inserted] = await db
    .insert(notificationChannels)
    .values({
      tenantId,
      channelType,
      adapterName,
      name,
      config,
      webhookVerifyToken: webhookVerifyToken ?? null,
    })
    .returning();

  await eventBus.emit('notifications.channel.created', {
    id: inserted.id,
    tenantId: inserted.tenantId,
    channelType: inserted.channelType,
    adapterName: inserted.adapterName,
  });

  return NextResponse.json(inserted, { status: 201 });
}
