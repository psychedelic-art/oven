import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { billingPlans, planQuotas, services } from '../schema';

// GET /api/billing-plans/public — Public pricing page data
export async function GET(_request: NextRequest) {
  const db = getDb();

  // Get all public enabled plans
  const plans = await db
    .select()
    .from(billingPlans)
    .where(and(eq(billingPlans.isPublic, true), eq(billingPlans.enabled, true)))
    .orderBy(asc(billingPlans.order));

  // For each plan, get quotas with service details
  const result = await Promise.all(
    plans.map(async (plan) => {
      const quotas = await db
        .select({
          service: services.slug,
          unit: services.unit,
          quota: planQuotas.quota,
          period: planQuotas.period,
        })
        .from(planQuotas)
        .innerJoin(services, eq(planQuotas.serviceId, services.id))
        .where(eq(planQuotas.planId, plan.id));

      return {
        id: plan.id,
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        billingCycle: plan.billingCycle,
        features: plan.features,
        order: plan.order,
        quotas,
      };
    })
  );

  return NextResponse.json(result);
}
