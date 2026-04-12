import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound, badRequest } from '@oven/module-registry/api-utils';

/** Only allow lowercase alphanumeric + dashes in service slugs. */
const SERVICE_SLUG_PATTERN = /^[a-z0-9-]+$/;
import {
  tenantSubscriptions,
  billingPlans,
  planQuotas,
  services,
  subscriptionQuotaOverrides,
} from '../schema';

// GET /api/tenant-subscriptions/[tenantId]/limits/[serviceSlug] — Single service limit
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; serviceSlug: string }> }
) {
  const db = getDb();
  const { tenantId, serviceSlug } = await params;
  const tid = parseInt(tenantId, 10);

  // Validate slug format (OWASP A03 — injection prevention)
  if (!SERVICE_SLUG_PATTERN.test(serviceSlug)) {
    return badRequest('Invalid serviceSlug format. Must match ^[a-z0-9-]+$');
  }

  // 1. Get active subscription
  const [subscription] = await db
    .select()
    .from(tenantSubscriptions)
    .innerJoin(billingPlans, eq(tenantSubscriptions.planId, billingPlans.id))
    .where(
      and(
        eq(tenantSubscriptions.tenantId, tid),
        eq(tenantSubscriptions.status, 'active')
      )
    )
    .limit(1);

  if (!subscription) return notFound('No active subscription found');

  // 2. Resolve service by slug
  const [service] = await db
    .select()
    .from(services)
    .where(eq(services.slug, serviceSlug))
    .limit(1);

  if (!service) return notFound('Service not found');

  // 3. Check for override
  const [override] = await db
    .select()
    .from(subscriptionQuotaOverrides)
    .where(
      and(
        eq(subscriptionQuotaOverrides.subscriptionId, subscription.sub_tenant_subscriptions.id),
        eq(subscriptionQuotaOverrides.serviceId, service.id)
      )
    )
    .limit(1);

  if (override) {
    return NextResponse.json({
      service: service.slug,
      unit: service.unit,
      quota: override.quota,
      period: 'monthly',
      source: 'override',
    });
  }

  // 4. Check plan quota
  const [planQuota] = await db
    .select()
    .from(planQuotas)
    .where(
      and(
        eq(planQuotas.planId, subscription.sub_tenant_subscriptions.planId),
        eq(planQuotas.serviceId, service.id)
      )
    )
    .limit(1);

  if (planQuota) {
    return NextResponse.json({
      service: service.slug,
      unit: service.unit,
      quota: planQuota.quota,
      period: planQuota.period,
      source: 'plan',
    });
  }

  // 5. Service not in plan
  return NextResponse.json({
    service: service.slug,
    unit: service.unit,
    quota: 0,
    period: 'monthly',
    source: 'none',
  });
}
