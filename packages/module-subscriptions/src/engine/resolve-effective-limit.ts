/**
 * Pure decision function for the subscriptions limit resolver.
 *
 * Implements the five-step algorithm documented in
 * `docs/modules/21-module-subscriptions.md` §5 and
 * `docs/modules/subscriptions/module-design.md` §"Limit resolver":
 *
 *   1. Active subscription exists? If not → not-subscribed.
 *   2. Service exists? (Caller resolves this; if the service lookup
 *      fails, the caller passes `null` for `serviceId`.)
 *   3. Override present for (subscription, service)? → override wins.
 *   4. Plan quota present for (plan, service)? → plan wins.
 *   5. Service not in plan → zero quota, source `not-in-plan`.
 *
 * This function takes the already-fetched rows as inputs and
 * returns a discriminated-union result. It never throws, never
 * returns null, and never touches the database. Every branch is
 * unit-tested in `src/__tests__/resolve-effective-limit.test.ts`.
 *
 * The existing `UsageMeteringService` engine keeps owning the DB
 * queries — this helper only owns the decision logic so it can be
 * exhaustively tested without an integration harness.
 */

export type ResolverSource =
  | 'not-subscribed'
  | 'unknown-service'
  | 'override'
  | 'plan'
  | 'not-in-plan';

export interface ResolvedLimit {
  /** Effective per-period quota. `0` when the source is a terminal-zero case. */
  limit: number;
  /** Period label from the winning row (`monthly` for overrides, plan's period otherwise). */
  period: string;
  /** Which resolver step produced the result. */
  source: ResolverSource;
}

export interface ResolveEffectiveLimitInput {
  /** Whether the tenant has an active subscription. */
  hasActiveSubscription: boolean;
  /** Whether the serviceSlug resolved to a real `sub_services` row. */
  serviceId: number | null;
  /** The override row for (subscription, service), if any. */
  override: { quota: number } | null;
  /** The plan quota row for (plan, service), if any. */
  planQuota: { quota: number; period: string } | null;
}

/**
 * Walk the five-step cascade and return the effective limit.
 *
 * @param input - Pre-fetched rows + flags. Caller is responsible for
 *                translating DB results into this shape.
 * @returns Discriminated-union result. Never `null`, never throws.
 */
export function resolveEffectiveLimit(
  input: ResolveEffectiveLimitInput
): ResolvedLimit {
  // Step 2: service lookup takes precedence over subscription check
  // because an unknown service is an input error (400) and should be
  // reported distinctly from "tenant has no subscription" (402).
  if (input.serviceId === null) {
    return { limit: 0, period: 'monthly', source: 'unknown-service' };
  }

  // Step 1: no active subscription → quota is zero.
  if (!input.hasActiveSubscription) {
    return { limit: 0, period: 'monthly', source: 'not-subscribed' };
  }

  // Step 3: override wins when present.
  if (input.override !== null) {
    return {
      limit: input.override.quota,
      period: 'monthly',
      source: 'override',
    };
  }

  // Step 4: plan quota is the baseline.
  if (input.planQuota !== null) {
    return {
      limit: input.planQuota.quota,
      period: input.planQuota.period,
      source: 'plan',
    };
  }

  // Step 5: service exists, subscription exists, but the plan does
  // not include this service. The BO rule (SUB-R2-3 from
  // detailed-requirements.md) says this means quota is ZERO, not
  // "unlimited". Explicit zero prevents silent over-use.
  return { limit: 0, period: 'monthly', source: 'not-in-plan' };
}

/**
 * Remaining quota after a given amount of usage, clamped to >= 0.
 *
 * Pure: `max(0, limit - used)`. Split out so that the usage-metering
 * engine and the dashboard UsageMeter component both share the
 * exact same math and the clamping is testable.
 */
export function computeRemaining(limit: number, used: number): number {
  return Math.max(0, limit - used);
}

/**
 * Whether a requested amount is allowed given a limit and current
 * usage. A zero limit with a zero estimated amount is NOT allowed —
 * the caller is requesting zero units of a service they have no
 * quota for, which is still a quota violation semantically (the
 * resolver source `not-subscribed` / `unknown-service` / `not-in-plan`
 * must not be silently treated as "fine, proceed").
 */
export function isAllowed(
  limit: number,
  used: number,
  estimatedAmount: number
): boolean {
  if (limit <= 0) return false;
  return used + estimatedAmount <= limit;
}
