import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import {
  tenantSubscriptions,
  billingPlans,
  planQuotas,
  services,
  subscriptionQuotaOverrides,
} from '../schema';

// GET /api/tenant-subscriptions/[tenantId]/limits — All effective limits for a tenant
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const db = getDb();
  const { tenantId } = await params;
  const tid = parseInt(tenantId, 10);

  // 1. Get active subscription with plan details
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

  // 2. Get plan quotas with service details
  const quotas = await db
    .select()
    .from(planQuotas)
    .innerJoin(services, eq(planQuotas.serviceId, services.id))
    .where(eq(planQuotas.planId, subscription.sub_tenant_subscriptions.planId));

  // 3. Get overrides for this subscription
  const overrides = await db
    .select()
    .from(subscriptionQuotaOverrides)
    .where(eq(subscriptionQuotaOverrides.subscriptionId, subscription.sub_tenant_subscriptions.id));

  const overrideMap = new Map(overrides.map((o) => [o.serviceId, o.quota]));

  // 4. Build effective limits
  const limits = quotas.map((q) => {
    const overrideQuota = overrideMap.get(q.sub_services.id);
    return {
      service: q.sub_services.slug,
      unit: q.sub_services.unit,
      quota: overrideQuota ?? q.sub_plan_quotas.quota,
      period: q.sub_plan_quotas.period,
      source: overrideQuota !== undefined ? 'override' : 'plan',
    };
  });

  return NextResponse.json({
    tenantId: tid,
    planName: subscription.sub_billing_plans.name,
    planSlug: subscription.sub_billing_plans.slug,
    limits,
  });
}
