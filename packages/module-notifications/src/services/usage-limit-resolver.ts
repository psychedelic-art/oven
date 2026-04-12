import type { ChannelType } from '../types';

// ─── Types ──────────────────────────────────────────────────

export interface UsageLimitResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  source: 'subscription' | 'config' | 'fail-safe';
}

/**
 * Dependencies injected at construction so the resolver never
 * imports module-subscriptions or module-config directly
 * (Rule 3.1 + Rule 3.2).
 */
export interface UsageLimitResolverDeps {
  /**
   * Attempt to check quota via module-subscriptions HTTP endpoint.
   * Returns null when the subscriptions module is not installed.
   */
  checkSubscriptionQuota: (
    tenantId: number,
    serviceSlug: string,
  ) => Promise<{ allowed: boolean; limit: number; used: number; remaining: number } | null>;

  /**
   * Resolve a config key via module-config resolve-batch endpoint.
   * Returns null when the config module is not reachable.
   */
  resolveConfigLimit: (
    tenantId: number,
    key: string,
  ) => Promise<number | null>;
}

// ─── Channel → service slug / config key mapping ────────────

const CHANNEL_SERVICE_SLUG: Record<ChannelType, string> = {
  whatsapp: 'notifications-whatsapp',
  sms: 'notifications-sms',
  email: 'notifications-email',
};

const CHANNEL_CONFIG_KEY: Record<ChannelType, string> = {
  whatsapp: 'DEFAULT_WHATSAPP_LIMIT',
  sms: 'DEFAULT_SMS_LIMIT',
  email: 'DEFAULT_EMAIL_LIMIT',
};

// ─── Resolver ───────────────────────────────────────────────

/**
 * Three-tier resolver for per-tenant, per-channel usage limits.
 *
 * Tier 1: module-subscriptions plan quota (HTTP, Rule 3.1).
 * Tier 2: module-config fallback limit (HTTP, Rule 3.2).
 * Tier 3: fail-safe — deny with limit=0 so no tenant gets
 *         unlimited messaging on a misconfigured install.
 */
export async function resolveUsageLimit(
  deps: UsageLimitResolverDeps,
  tenantId: number,
  channelType: ChannelType,
  currentUsed: number,
): Promise<UsageLimitResult> {
  const serviceSlug = CHANNEL_SERVICE_SLUG[channelType];

  // Tier 1: module-subscriptions
  const quotaResult = await deps.checkSubscriptionQuota(tenantId, serviceSlug);
  if (quotaResult !== null) {
    return {
      allowed: quotaResult.allowed,
      limit: quotaResult.limit,
      used: currentUsed,
      remaining: Math.max(0, quotaResult.limit - currentUsed),
      source: 'subscription',
    };
  }

  // Tier 2: module-config fallback
  const configKey = CHANNEL_CONFIG_KEY[channelType];
  const configLimit = await deps.resolveConfigLimit(tenantId, configKey);
  if (configLimit !== null && configLimit > 0) {
    return {
      allowed: currentUsed < configLimit,
      limit: configLimit,
      used: currentUsed,
      remaining: Math.max(0, configLimit - currentUsed),
      source: 'config',
    };
  }

  // Tier 3: fail-safe
  return {
    allowed: false,
    limit: 0,
    used: currentUsed,
    remaining: 0,
    source: 'fail-safe',
  };
}
