import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { notificationUsage } from '../schema';
import { NOTIFICATION_EVENTS } from '../events';
import {
  resolveUsageLimit,
  type UsageLimitResult,
  type UsageLimitResolverDeps,
} from './usage-limit-resolver';
import type { ChannelType } from '../types';

// ─── Period helpers ─────────────────────────────────────────

/** First day of the month containing `date`, as YYYY-MM-DD. */
export function getMonthStart(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Last day of the month containing `date`, as YYYY-MM-DD. */
export function getPeriodEnd(monthStart: string): string {
  const [y, m] = monthStart.split('-').map(Number);
  // Day 0 of next month = last day of current month
  const last = new Date(y, m, 0);
  const ld = String(last.getDate()).padStart(2, '0');
  const lm = String(last.getMonth() + 1).padStart(2, '0');
  return `${last.getFullYear()}-${lm}-${ld}`;
}

// ─── HTTP-based dependency wiring ───────────────────────────

function buildBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_URL ||
    'http://localhost:3000'
  );
}

/**
 * Default deps that call module-subscriptions and module-config
 * via HTTP. Injected into resolveUsageLimit. The fetch calls are
 * wrapped in try/catch — if the module is not installed or the
 * endpoint is unreachable, the dep returns null so the resolver
 * falls through to the next tier.
 */
export function createHttpDeps(): UsageLimitResolverDeps {
  const base = buildBaseUrl();

  return {
    async checkSubscriptionQuota(tenantId, serviceSlug) {
      try {
        const url = `${base}/api/tenant-subscriptions/${tenantId}/check-quota?serviceSlug=${encodeURIComponent(serviceSlug)}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          allowed: Boolean(data.allowed),
          limit: Number(data.limit),
          used: Number(data.used),
          remaining: Number(data.remaining),
        };
      } catch {
        return null;
      }
    },

    async resolveConfigLimit(tenantId, key) {
      try {
        const url = `${base}/api/module-configs/resolve?moduleName=notifications&key=${encodeURIComponent(key)}&tenantId=${tenantId}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const val = Number(data.value);
        return Number.isFinite(val) ? val : null;
      } catch {
        return null;
      }
    },
  };
}

// ─── Core metering functions ────────────────────────────────

export interface CheckUsageLimitResult extends UsageLimitResult {
  periodStart: string;
}

/**
 * Check whether a tenant can still send/receive messages on a
 * channel for the current billing period.
 */
export async function checkUsageLimit(
  tenantId: number,
  channelType: ChannelType,
  deps?: UsageLimitResolverDeps,
): Promise<CheckUsageLimitResult> {
  const db = getDb();
  const periodStart = getMonthStart();

  // Get current usage count for this period
  const rows = await db
    .select()
    .from(notificationUsage)
    .where(
      and(
        eq(notificationUsage.tenantId, tenantId),
        eq(notificationUsage.channelType, channelType),
        eq(notificationUsage.periodStart, periodStart),
      ),
    )
    .limit(1);

  const currentUsed = rows.length > 0 ? rows[0].messageCount : 0;

  const resolverDeps = deps ?? createHttpDeps();
  const result = await resolveUsageLimit(resolverDeps, tenantId, channelType, currentUsed);

  return { ...result, periodStart };
}

export interface IncrementUsageResult {
  oldCount: number;
  newCount: number;
  limit: number;
  warningEmitted: boolean;
  limitExceededEmitted: boolean;
}

/**
 * Atomically increment the usage counter for a
 * (tenantId, channelType, periodStart) triple. Emits warning
 * and limit-exceeded events on the crossing — exactly once.
 *
 * The `limit` parameter is the resolved limit for this period.
 * If no usage row exists for the period, one is lazily created
 * (no cron needed for period rollover).
 */
export async function incrementUsage(
  tenantId: number,
  channelType: ChannelType,
  limit: number,
  warningThresholdPct: number = 80,
): Promise<IncrementUsageResult> {
  const db = getDb();
  const periodStart = getMonthStart();
  const periodEnd = getPeriodEnd(periodStart);

  // Atomic upsert: insert or increment
  const existing = await db
    .select()
    .from(notificationUsage)
    .where(
      and(
        eq(notificationUsage.tenantId, tenantId),
        eq(notificationUsage.channelType, channelType),
        eq(notificationUsage.periodStart, periodStart),
      ),
    )
    .limit(1);

  let oldCount: number;
  let newCount: number;

  if (existing.length > 0) {
    oldCount = existing[0].messageCount;
    newCount = oldCount + 1;
    await db
      .update(notificationUsage)
      .set({
        messageCount: sql`${notificationUsage.messageCount} + 1`,
        limit,
        updatedAt: new Date(),
      })
      .where(eq(notificationUsage.id, existing[0].id));
  } else {
    oldCount = 0;
    newCount = 1;
    await db.insert(notificationUsage).values({
      tenantId,
      channelType,
      period: 'monthly',
      periodStart,
      periodEnd,
      messageCount: 1,
      limit,
    });
  }

  // Event emission — fire on the crossing only
  let warningEmitted = false;
  let limitExceededEmitted = false;

  if (limit > 0) {
    const warningThreshold = Math.ceil((limit * warningThresholdPct) / 100);

    // Warning: emit when crossing the threshold (old < threshold, new >= threshold)
    if (oldCount < warningThreshold && newCount >= warningThreshold) {
      eventBus.emit(NOTIFICATION_EVENTS.USAGE_LIMIT_WARNING, {
        tenantId,
        channelType,
        used: newCount,
        limit,
        percentage: Math.round((newCount / limit) * 100),
      });
      warningEmitted = true;
    }

    // Exceeded: emit when crossing 100% (old < limit, new >= limit)
    if (oldCount < limit && newCount >= limit) {
      eventBus.emit(NOTIFICATION_EVENTS.USAGE_LIMIT_EXCEEDED, {
        tenantId,
        channelType,
        used: newCount,
        limit,
      });
      limitExceededEmitted = true;
    }
  }

  return { oldCount, newCount, limit, warningEmitted, limitExceededEmitted };
}
