import { describe, it, expect } from 'vitest';
import {
  resolveEffectiveLimit,
  computeRemaining,
  isAllowed,
} from '../engine/resolve-effective-limit';
import type { ResolveEffectiveLimitInput } from '../engine/resolve-effective-limit';

// Small factory so test cases stay readable. Every test overrides
// only the fields that matter, mirroring the real engine's
// pre-fetched-rows shape.
function inputWith(
  overrides: Partial<ResolveEffectiveLimitInput>
): ResolveEffectiveLimitInput {
  return {
    hasActiveSubscription: true,
    serviceId: 42,
    override: null,
    planQuota: null,
    ...overrides,
  };
}

describe('engine/resolve-effective-limit — resolveEffectiveLimit', () => {
  describe('step 2: unknown service (SUB-R5)', () => {
    it('returns `unknown-service` when the service slug did not resolve to a row', () => {
      const result = resolveEffectiveLimit(inputWith({ serviceId: null }));
      expect(result).toEqual({
        limit: 0,
        period: 'monthly',
        source: 'unknown-service',
      });
    });

    it('prefers `unknown-service` over `not-subscribed` when both are true', () => {
      // An unknown service is an input error (400) and must win
      // over a tenant-state error (402) so the client receives
      // the actionable message.
      const result = resolveEffectiveLimit(
        inputWith({ serviceId: null, hasActiveSubscription: false })
      );
      expect(result.source).toBe('unknown-service');
    });
  });

  describe('step 1: no active subscription', () => {
    it('returns `not-subscribed` when the tenant has no active subscription', () => {
      const result = resolveEffectiveLimit(
        inputWith({ hasActiveSubscription: false })
      );
      expect(result).toEqual({
        limit: 0,
        period: 'monthly',
        source: 'not-subscribed',
      });
    });

    it('returns `not-subscribed` even if a plan quota or override would otherwise apply', () => {
      // Defence in depth: a stale override row must never grant
      // quota to a tenant whose subscription has been canceled.
      const result = resolveEffectiveLimit(
        inputWith({
          hasActiveSubscription: false,
          override: { quota: 999 },
          planQuota: { quota: 500, period: 'monthly' },
        })
      );
      expect(result.source).toBe('not-subscribed');
      expect(result.limit).toBe(0);
    });
  });

  describe('step 3: override wins', () => {
    it('returns `override` source with the override quota', () => {
      const result = resolveEffectiveLimit(
        inputWith({
          override: { quota: 1000 },
          planQuota: { quota: 300, period: 'monthly' },
        })
      );
      expect(result).toEqual({
        limit: 1000,
        period: 'monthly',
        source: 'override',
      });
    });

    it('override wins even when its quota is lower than the plan quota', () => {
      // Override replaces the plan quota, it does not max() with it.
      const result = resolveEffectiveLimit(
        inputWith({
          override: { quota: 50 },
          planQuota: { quota: 300, period: 'monthly' },
        })
      );
      expect(result.limit).toBe(50);
      expect(result.source).toBe('override');
    });

    it('override of zero is a valid (explicit suspension) result', () => {
      const result = resolveEffectiveLimit(
        inputWith({
          override: { quota: 0 },
          planQuota: { quota: 300, period: 'monthly' },
        })
      );
      expect(result.limit).toBe(0);
      expect(result.source).toBe('override');
    });

    it('override coerces period to `monthly` regardless of plan period', () => {
      // Overrides are always modelled as monthly windows in the
      // current engine — the canonical doc explicitly states this.
      const result = resolveEffectiveLimit(
        inputWith({
          override: { quota: 200 },
          planQuota: { quota: 300, period: 'yearly' },
        })
      );
      expect(result.period).toBe('monthly');
    });
  });

  describe('step 4: plan quota', () => {
    it('returns `plan` source with the plan quota when no override exists', () => {
      const result = resolveEffectiveLimit(
        inputWith({
          override: null,
          planQuota: { quota: 300, period: 'monthly' },
        })
      );
      expect(result).toEqual({
        limit: 300,
        period: 'monthly',
        source: 'plan',
      });
    });

    it('preserves the plan period (monthly)', () => {
      const result = resolveEffectiveLimit(
        inputWith({ planQuota: { quota: 100, period: 'monthly' } })
      );
      expect(result.period).toBe('monthly');
    });

    it('preserves the plan period (daily)', () => {
      const result = resolveEffectiveLimit(
        inputWith({ planQuota: { quota: 10, period: 'daily' } })
      );
      expect(result.period).toBe('daily');
    });

    it('preserves the plan period (yearly)', () => {
      const result = resolveEffectiveLimit(
        inputWith({ planQuota: { quota: 100000, period: 'yearly' } })
      );
      expect(result.period).toBe('yearly');
    });
  });

  describe('step 5: service not in plan', () => {
    it('returns `not-in-plan` with zero quota when the plan has no quota for the service', () => {
      const result = resolveEffectiveLimit(
        inputWith({ override: null, planQuota: null })
      );
      expect(result).toEqual({
        limit: 0,
        period: 'monthly',
        source: 'not-in-plan',
      });
    });

    it('never returns null, never throws — the five-step cascade is total', () => {
      expect(() =>
        resolveEffectiveLimit(inputWith({ override: null, planQuota: null }))
      ).not.toThrow();
      expect(
        resolveEffectiveLimit(inputWith({ override: null, planQuota: null }))
      ).not.toBeNull();
    });
  });
});

describe('engine/resolve-effective-limit — computeRemaining', () => {
  it('returns limit minus used', () => {
    expect(computeRemaining(100, 40)).toBe(60);
  });

  it('returns zero when used equals limit', () => {
    expect(computeRemaining(100, 100)).toBe(0);
  });

  it('clamps to zero when used exceeds limit (no negative remaining)', () => {
    expect(computeRemaining(100, 150)).toBe(0);
  });

  it('returns the full limit when used is zero', () => {
    expect(computeRemaining(100, 0)).toBe(100);
  });

  it('handles a zero limit (returns zero)', () => {
    expect(computeRemaining(0, 0)).toBe(0);
  });
});

describe('engine/resolve-effective-limit — isAllowed', () => {
  it('returns true when used + estimated is within the limit', () => {
    expect(isAllowed(100, 40, 10)).toBe(true);
  });

  it('returns true when used + estimated equals the limit (boundary)', () => {
    expect(isAllowed(100, 40, 60)).toBe(true);
  });

  it('returns false when used + estimated exceeds the limit', () => {
    expect(isAllowed(100, 40, 61)).toBe(false);
  });

  it('returns false when limit is zero, even if estimated is zero', () => {
    // SUB-R5 rule: a zero limit is always a hard stop, regardless
    // of the estimated amount. A caller asking for zero units of a
    // service they have no quota for is still reaching a
    // not-subscribed / not-in-plan surface that must surface an
    // error, not a silent allow.
    expect(isAllowed(0, 0, 0)).toBe(false);
    expect(isAllowed(0, 0, 1)).toBe(false);
  });

  it('returns false when limit is negative (should never happen, defence in depth)', () => {
    expect(isAllowed(-5, 0, 1)).toBe(false);
  });

  it('allows a request at exactly the remaining boundary', () => {
    // Tenant has 100-quota, has used 99, wants 1 more: allowed.
    expect(isAllowed(100, 99, 1)).toBe(true);
    // Tenant has 100-quota, has used 99, wants 2 more: blocked.
    expect(isAllowed(100, 99, 2)).toBe(false);
  });
});
