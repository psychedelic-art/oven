import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import {
  usageRecords,
  services,
  tenantSubscriptions,
  billingPlans,
  planQuotas,
  subscriptionQuotaOverrides,
} from '../schema';
import { computeBillingCycle } from './billing-cycle';
import {
  resolveEffectiveLimit,
  computeRemaining,
} from './resolve-effective-limit';

export interface TrackUsageParams {
  tenantId: number;
  serviceSlug: string;
  amount: number;
  idempotencyKey?: string;
  upstreamCostCents?: number;
  metadata?: Record<string, unknown>;
}

export interface TrackUsageResult {
  recorded: boolean;
  remaining: number;
  exceeded: boolean;
}

export interface CheckQuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
}

export interface ServiceUsage {
  serviceSlug: string;
  serviceName: string;
  unit: string;
  used: number;
  limit: number;
  remaining: number;
  period: string;
  source: 'plan' | 'override';
}

/**
 * Compute billing cycle string for current month (e.g., "2026-04").
 *
 * Thin wrapper around the pure `computeBillingCycle` helper in
 * `./billing-cycle.ts`. The wrapper is kept so existing call sites
 * in this file do not need to pass an explicit `new Date()`.
 */
function getCurrentBillingCycle(): string {
  return computeBillingCycle();
}

/**
 * Resolve a service by slug, returning its id and unit.
 */
async function resolveService(db: ReturnType<typeof getDb>, slug: string) {
  const [service] = await db
    .select({ id: services.id, unit: services.unit, name: services.name })
    .from(services)
    .where(eq(services.slug, slug))
    .limit(1);
  return service ?? null;
}

/**
 * Get the effective quota limit for a tenant + service.
 *
 * DB reads are done here; the decision logic is delegated to the
 * pure `resolveEffectiveLimit` helper in `./resolve-effective-limit.ts`,
 * which is exhaustively unit-tested. Keeping the DB access and the
 * decision separate is the sprint-01 refactor that lets us prove
 * the five-step cascade is correct without a live database.
 *
 * The historical return shape (`null` for "no quota available") is
 * preserved so the two existing call sites in this file do not
 * need to change — the resolver's discriminated-union result is
 * mapped back to `null` for the terminal-zero cases.
 */
async function getEffectiveLimit(
  db: ReturnType<typeof getDb>,
  tenantId: number,
  serviceId: number
): Promise<{ limit: number; period: string; source: 'plan' | 'override' } | null> {
  // 1. Find active subscription
  const [subscription] = await db
    .select({
      subscriptionId: tenantSubscriptions.id,
      planId: tenantSubscriptions.planId,
    })
    .from(tenantSubscriptions)
    .where(
      and(
        eq(tenantSubscriptions.tenantId, tenantId),
        eq(tenantSubscriptions.status, 'active')
      )
    )
    .limit(1);

  // 2. Check override (only if we have a subscription)
  let override: { quota: number } | null = null;
  if (subscription) {
    const [row] = await db
      .select({ quota: subscriptionQuotaOverrides.quota })
      .from(subscriptionQuotaOverrides)
      .where(
        and(
          eq(subscriptionQuotaOverrides.subscriptionId, subscription.subscriptionId),
          eq(subscriptionQuotaOverrides.serviceId, serviceId)
        )
      )
      .limit(1);
    if (row) override = { quota: row.quota };
  }

  // 3. Fall back to plan quota
  let planQuota: { quota: number; period: string } | null = null;
  if (subscription) {
    const [row] = await db
      .select({ quota: planQuotas.quota, period: planQuotas.period })
      .from(planQuotas)
      .where(
        and(
          eq(planQuotas.planId, subscription.planId),
          eq(planQuotas.serviceId, serviceId)
        )
      )
      .limit(1);
    if (row) planQuota = { quota: row.quota, period: row.period };
  }

  // 4. Delegate the cascade decision to the pure helper.
  const resolved = resolveEffectiveLimit({
    hasActiveSubscription: !!subscription,
    serviceId,
    override,
    planQuota,
  });

  // Preserve the legacy return contract: any source other than
  // `override` or `plan` maps back to `null` so existing call sites
  // continue to treat zero-quota outcomes as "no limit available".
  if (resolved.source === 'override' || resolved.source === 'plan') {
    return {
      limit: resolved.limit,
      period: resolved.period,
      source: resolved.source,
    };
  }
  return null;
}

/**
 * Sum usage for a tenant + service in the current billing cycle.
 */
async function getCurrentUsage(
  db: ReturnType<typeof getDb>,
  tenantId: number,
  serviceId: number,
  billingCycle: string
): Promise<number> {
  const [result] = await db
    .select({ total: sql<number>`COALESCE(SUM(${usageRecords.amount}), 0)` })
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.tenantId, tenantId),
        eq(usageRecords.serviceId, serviceId),
        eq(usageRecords.billingCycle, billingCycle)
      )
    );
  return Number(result?.total ?? 0);
}

export class UsageMeteringService {
  /**
   * Record a usage event and check if the tenant has exceeded their quota.
   */
  async trackUsage(params: TrackUsageParams): Promise<TrackUsageResult> {
    const db = getDb();
    const { tenantId, serviceSlug, amount, idempotencyKey, upstreamCostCents, metadata } = params;

    const service = await resolveService(db, serviceSlug);
    if (!service) {
      return { recorded: false, remaining: 0, exceeded: false };
    }

    const billingCycle = getCurrentBillingCycle();

    // Idempotency check: if a key was provided, look for an existing
    // record with the same (tenantId, idempotencyKey). If found, skip
    // the insert and return the current quota state instead.
    if (idempotencyKey) {
      const [existing] = await db
        .select({ id: usageRecords.id })
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.tenantId, tenantId),
            eq(usageRecords.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);

      if (existing) {
        const effectiveLimit = await getEffectiveLimit(db, tenantId, service.id);
        if (!effectiveLimit) {
          return { recorded: true, remaining: 0, exceeded: false };
        }
        const used = await getCurrentUsage(db, tenantId, service.id, billingCycle);
        const remaining = computeRemaining(effectiveLimit.limit, used);
        const exceeded = used > effectiveLimit.limit;
        return { recorded: true, remaining, exceeded };
      }
    }

    // Get active subscription ID for the record
    const [subscription] = await db
      .select({ id: tenantSubscriptions.id })
      .from(tenantSubscriptions)
      .where(
        and(
          eq(tenantSubscriptions.tenantId, tenantId),
          eq(tenantSubscriptions.status, 'active')
        )
      )
      .limit(1);

    // Insert usage record
    await db.insert(usageRecords).values({
      tenantId,
      subscriptionId: subscription?.id ?? null,
      serviceId: service.id,
      amount,
      unit: service.unit,
      billingCycle,
      idempotencyKey: idempotencyKey ?? null,
      upstreamCostCents: upstreamCostCents ?? null,
      metadata: metadata ?? null,
    });

    // Check quota
    const effectiveLimit = await getEffectiveLimit(db, tenantId, service.id);
    if (!effectiveLimit) {
      return { recorded: true, remaining: 0, exceeded: false };
    }

    const used = await getCurrentUsage(db, tenantId, service.id, billingCycle);
    const remaining = computeRemaining(effectiveLimit.limit, used);
    const exceeded = used > effectiveLimit.limit;

    if (exceeded) {
      await eventBus.emit('subscriptions.quota.exceeded', {
        tenantId,
        serviceSlug,
        currentUsage: used,
        quota: effectiveLimit.limit,
      });
    }

    return { recorded: true, remaining, exceeded };
  }

  /**
   * Check if a tenant has enough quota for an estimated operation.
   */
  async checkQuota(
    tenantId: number,
    serviceSlug: string,
    estimatedAmount: number = 0
  ): Promise<CheckQuotaResult> {
    const db = getDb();

    const service = await resolveService(db, serviceSlug);
    if (!service) {
      return { allowed: false, remaining: 0, limit: 0, used: 0 };
    }

    const effectiveLimit = await getEffectiveLimit(db, tenantId, service.id);
    if (!effectiveLimit) {
      return { allowed: false, remaining: 0, limit: 0, used: 0 };
    }

    const billingCycle = getCurrentBillingCycle();
    const used = await getCurrentUsage(db, tenantId, service.id, billingCycle);
    const remaining = computeRemaining(effectiveLimit.limit, used);
    const allowed = remaining >= estimatedAmount;

    return { allowed, remaining, limit: effectiveLimit.limit, used };
  }

  /**
   * Get aggregated usage summary for a tenant across all services.
   */
  async getUsageSummary(
    tenantId: number,
    billingCycle?: string
  ): Promise<ServiceUsage[]> {
    const db = getDb();
    const cycle = billingCycle ?? getCurrentBillingCycle();

    // Get all usage for this tenant in the billing cycle
    const usage = await db
      .select({
        serviceId: usageRecords.serviceId,
        total: sql<number>`COALESCE(SUM(${usageRecords.amount}), 0)`,
      })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.tenantId, tenantId),
          eq(usageRecords.billingCycle, cycle)
        )
      )
      .groupBy(usageRecords.serviceId);

    const usageMap = new Map(usage.map((u) => [u.serviceId, Number(u.total)]));

    // Get all plan quotas for this tenant
    const [subscription] = await db
      .select({
        subscriptionId: tenantSubscriptions.id,
        planId: tenantSubscriptions.planId,
      })
      .from(tenantSubscriptions)
      .where(
        and(
          eq(tenantSubscriptions.tenantId, tenantId),
          eq(tenantSubscriptions.status, 'active')
        )
      )
      .limit(1);

    if (!subscription) return [];

    const quotas = await db
      .select({
        serviceId: planQuotas.serviceId,
        serviceSlug: services.slug,
        serviceName: services.name,
        unit: services.unit,
        quota: planQuotas.quota,
        period: planQuotas.period,
      })
      .from(planQuotas)
      .innerJoin(services, eq(planQuotas.serviceId, services.id))
      .where(eq(planQuotas.planId, subscription.planId));

    // Get overrides
    const overrides = await db
      .select({
        serviceId: subscriptionQuotaOverrides.serviceId,
        quota: subscriptionQuotaOverrides.quota,
      })
      .from(subscriptionQuotaOverrides)
      .where(eq(subscriptionQuotaOverrides.subscriptionId, subscription.subscriptionId));

    const overrideMap = new Map(overrides.map((o) => [o.serviceId, o.quota]));

    return quotas.map((q) => {
      const overrideQuota = overrideMap.get(q.serviceId);
      const limit = overrideQuota ?? q.quota;
      const used = usageMap.get(q.serviceId) ?? 0;
      return {
        serviceSlug: q.serviceSlug,
        serviceName: q.serviceName,
        unit: q.unit,
        used,
        limit,
        remaining: computeRemaining(limit, used),
        period: q.period,
        source: overrideQuota !== undefined ? 'override' as const : 'plan' as const,
      };
    });
  }
}

/** Singleton instance */
export const usageMeteringService = new UsageMeteringService();
