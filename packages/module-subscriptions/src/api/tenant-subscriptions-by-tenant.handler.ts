import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { tenantSubscriptions } from '../schema';

// GET /api/tenant-subscriptions/by-tenant/[tenantId] — Active subscription for tenant
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const db = getDb();
  const { tenantId } = await params;

  const [result] = await db
    .select()
    .from(tenantSubscriptions)
    .where(
      and(
        eq(tenantSubscriptions.tenantId, parseInt(tenantId, 10)),
        eq(tenantSubscriptions.status, 'active')
      )
    )
    .limit(1);

  if (!result) return notFound('No active subscription found for this tenant');
  return NextResponse.json(result);
}
