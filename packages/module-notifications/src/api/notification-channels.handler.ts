import { type NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { notificationChannels } from '../schema';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();

  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(notificationChannels.tenantId, Number(params.filter.tenantId)));
  }
  if (params.filter.channelType) {
    conditions.push(eq(notificationChannels.channelType, String(params.filter.channelType)));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(notificationChannels.enabled, Boolean(params.filter.enabled)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderCol =
    params.sort === 'name'
      ? notificationChannels.name
      : params.sort === 'channelType'
        ? notificationChannels.channelType
        : notificationChannels.id;
  const orderFn = params.order === 'desc' ? desc : asc;

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(notificationChannels)
      .where(where)
      .orderBy(orderFn(orderCol))
      .limit(params.limit)
      .offset(params.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationChannels)
      .where(where),
  ]);

  return listResponse(data, 'notification-channels', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.tenantId || !body.channelType || !body.adapterName || !body.name || !body.config) {
    return badRequest('tenantId, channelType, adapterName, name, and config are required');
  }

  const db = getDb();
  const [result] = await db
    .insert(notificationChannels)
    .values({
      tenantId: body.tenantId,
      channelType: body.channelType,
      adapterName: body.adapterName,
      name: body.name,
      config: body.config,
      webhookVerifyToken: body.webhookVerifyToken ?? null,
      enabled: body.enabled ?? true,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
