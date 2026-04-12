import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { badRequest } from '@oven/module-registry/api-utils';
import { notificationUsage } from '../schema';
import { getMonthStart } from '../services/usage-metering';
import type { ChannelType } from '../types';

const VALID_CHANNEL_TYPES: ChannelType[] = ['whatsapp', 'sms', 'email'];

/**
 * GET /api/notifications/usage?tenantId=N[&channelType=whatsapp]
 *
 * Returns the usage summary for a tenant, optionally filtered by
 * channel type. When channelType is omitted, returns rows for
 * all channel types that have usage records this period.
 */
export async function GET(request: NextRequest) {
  const tenantIdRaw = request.nextUrl.searchParams.get('tenantId');
  if (!tenantIdRaw) {
    return badRequest('tenantId query parameter is required');
  }

  const tenantId = Number(tenantIdRaw);
  if (!Number.isFinite(tenantId) || tenantId <= 0) {
    return badRequest('tenantId must be a positive integer');
  }

  const channelTypeRaw = request.nextUrl.searchParams.get('channelType');
  if (channelTypeRaw && !VALID_CHANNEL_TYPES.includes(channelTypeRaw as ChannelType)) {
    return badRequest(`channelType must be one of: ${VALID_CHANNEL_TYPES.join(', ')}`);
  }

  const db = getDb();
  const periodStart = getMonthStart();

  const conditions = [
    eq(notificationUsage.tenantId, tenantId),
    eq(notificationUsage.periodStart, periodStart),
  ];

  if (channelTypeRaw) {
    conditions.push(eq(notificationUsage.channelType, channelTypeRaw));
  }

  const rows = await db
    .select()
    .from(notificationUsage)
    .where(and(...conditions));

  const summary = rows.map((row: {
    channelType: string;
    messageCount: number;
    limit: number;
    periodStart: string;
    periodEnd: string;
  }) => ({
    channelType: row.channelType,
    used: row.messageCount,
    limit: row.limit,
    remaining: Math.max(0, row.limit - row.messageCount),
    allowed: row.messageCount < row.limit,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
  }));

  return NextResponse.json({ tenantId, periodStart, usage: summary });
}
