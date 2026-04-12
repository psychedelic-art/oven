import { describe, it, expect } from 'vitest';

import {
  resolveUsageLimit,
  type UsageLimitResolverDeps,
} from '../services/usage-limit-resolver';

// ─── Tier 1: module-subscriptions ───────────────────────────

describe('resolveUsageLimit — tier 1 (subscriptions)', () => {
  it('returns subscription source when quota is available', async () => {
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => ({
        allowed: true,
        limit: 500,
        used: 100,
        remaining: 400,
      }),
      resolveConfigLimit: async () => 300,
    };

    const result = await resolveUsageLimit(deps, 1, 'whatsapp', 100);

    expect(result.source).toBe('subscription');
    expect(result.limit).toBe(500);
    expect(result.used).toBe(100);
    expect(result.remaining).toBe(400);
    expect(result.allowed).toBe(true);
  });

  it('returns not-allowed when subscription quota is exceeded', async () => {
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => ({
        allowed: false,
        limit: 100,
        used: 100,
        remaining: 0,
      }),
      resolveConfigLimit: async () => 300,
    };

    const result = await resolveUsageLimit(deps, 1, 'whatsapp', 100);

    expect(result.source).toBe('subscription');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('uses currentUsed for remaining calculation, not subscription used', async () => {
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => ({
        allowed: true,
        limit: 500,
        used: 50, // subscription says 50 but local counter is 80
        remaining: 450,
      }),
      resolveConfigLimit: async () => null,
    };

    const result = await resolveUsageLimit(deps, 1, 'sms', 80);

    expect(result.source).toBe('subscription');
    expect(result.used).toBe(80);
    expect(result.remaining).toBe(420); // limit - currentUsed
  });
});

// ─── Tier 2: module-config fallback ─────────────────────────

describe('resolveUsageLimit — tier 2 (config fallback)', () => {
  it('falls through to config when subscriptions returns null', async () => {
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => null,
      resolveConfigLimit: async () => 300,
    };

    const result = await resolveUsageLimit(deps, 1, 'whatsapp', 50);

    expect(result.source).toBe('config');
    expect(result.limit).toBe(300);
    expect(result.used).toBe(50);
    expect(result.remaining).toBe(250);
    expect(result.allowed).toBe(true);
  });

  it('returns not-allowed when config limit is reached', async () => {
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => null,
      resolveConfigLimit: async () => 200,
    };

    const result = await resolveUsageLimit(deps, 1, 'sms', 200);

    expect(result.source).toBe('config');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resolves correct config key per channel type', async () => {
    const keysRequested: string[] = [];
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => null,
      resolveConfigLimit: async (_tid, key) => {
        keysRequested.push(key);
        return 100;
      },
    };

    await resolveUsageLimit(deps, 1, 'whatsapp', 0);
    await resolveUsageLimit(deps, 1, 'sms', 0);
    await resolveUsageLimit(deps, 1, 'email', 0);

    expect(keysRequested).toEqual([
      'DEFAULT_WHATSAPP_LIMIT',
      'DEFAULT_SMS_LIMIT',
      'DEFAULT_EMAIL_LIMIT',
    ]);
  });
});

// ─── Tier 3: fail-safe ──────────────────────────────────────

describe('resolveUsageLimit — tier 3 (fail-safe)', () => {
  it('returns fail-safe when both tiers return null', async () => {
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => null,
      resolveConfigLimit: async () => null,
    };

    const result = await resolveUsageLimit(deps, 1, 'whatsapp', 10);

    expect(result.source).toBe('fail-safe');
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.used).toBe(10);
  });

  it('returns fail-safe when config returns 0', async () => {
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => null,
      resolveConfigLimit: async () => 0,
    };

    const result = await resolveUsageLimit(deps, 1, 'email', 5);

    expect(result.source).toBe('fail-safe');
    expect(result.allowed).toBe(false);
    expect(result.limit).toBe(0);
  });

  it('returns fail-safe when config returns negative', async () => {
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => null,
      resolveConfigLimit: async () => -1,
    };

    const result = await resolveUsageLimit(deps, 1, 'whatsapp', 0);

    expect(result.source).toBe('fail-safe');
    expect(result.allowed).toBe(false);
  });
});

// ─── Service slug mapping ───────────────────────────────────

describe('resolveUsageLimit — service slug mapping', () => {
  it('maps whatsapp to notifications-whatsapp slug', async () => {
    let slugRequested = '';
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async (_tid, slug) => {
        slugRequested = slug;
        return { allowed: true, limit: 100, used: 0, remaining: 100 };
      },
      resolveConfigLimit: async () => null,
    };

    await resolveUsageLimit(deps, 1, 'whatsapp', 0);
    expect(slugRequested).toBe('notifications-whatsapp');
  });

  it('maps sms to notifications-sms slug', async () => {
    let slugRequested = '';
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async (_tid, slug) => {
        slugRequested = slug;
        return { allowed: true, limit: 100, used: 0, remaining: 100 };
      },
      resolveConfigLimit: async () => null,
    };

    await resolveUsageLimit(deps, 1, 'sms', 0);
    expect(slugRequested).toBe('notifications-sms');
  });

  it('maps email to notifications-email slug', async () => {
    let slugRequested = '';
    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async (_tid, slug) => {
        slugRequested = slug;
        return { allowed: true, limit: 100, used: 0, remaining: 100 };
      },
      resolveConfigLimit: async () => null,
    };

    await resolveUsageLimit(deps, 1, 'email', 0);
    expect(slugRequested).toBe('notifications-email');
  });
});
