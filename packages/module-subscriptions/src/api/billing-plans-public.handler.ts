import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { billingPlans, planQuotas, services } from '../schema';
import type { PublicBillingPlan } from '../types';

// GET /api/billing-plans/public — Public pricing page data
// Explicit projection: only marketing-safe columns are selected.
// Never use select() (all columns) on a public endpoint.
export async function GET(_request: NextRequest) {
  const db = getDb();

  // Explicit column projection — no internal columns
  const plans = await db
    .select({
      id: billingPlans.id,
      name: billingPlans.name,
      slug: billingPlans.slug,
      description: billingPlans.description,
      price: billingPlans.price,
      currency: billingPlans.currency,
      billingCycle: billingPlans.billingCycle,
      features: billingPlans.features,
      order: billingPlans.order,
    })
    .from(billingPlans)
    .where(and(eq(billingPlans.isPublic, true), eq(billingPlans.enabled, true)))
    .orderBy(asc(billingPlans.order));

  // For each plan, get quotas with service details
  const result: PublicBillingPlan[] = await Promise.all(
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
        features: plan.features as Record<string, unknown> | null,
        order: plan.order,
        quotas,
      };
    })
  );

  return NextResponse.json(result);
}
