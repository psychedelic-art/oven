import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn() },
}));

import {
  getMonthStart,
  getPeriodEnd,
  checkUsageLimit,
  incrementUsage,
} from '../services/usage-metering';
import type { UsageLimitResolverDeps } from '../services/usage-limit-resolver';
import { NOTIFICATION_EVENTS } from '../events';

// ─── Period helpers ─────────────────────────────────────────

describe('getMonthStart', () => {
  it('returns the first day of the given month', () => {
    expect(getMonthStart(new Date('2026-04-15'))).toBe('2026-04-01');
  });

  it('handles January correctly', () => {
    expect(getMonthStart(new Date('2026-01-31'))).toBe('2026-01-01');
  });

  it('handles December correctly', () => {
    expect(getMonthStart(new Date('2026-12-25'))).toBe('2026-12-01');
  });
});

describe('getPeriodEnd', () => {
  it('returns the last day of the month', () => {
    expect(getPeriodEnd('2026-04-01')).toBe('2026-04-30');
  });

  it('handles February in a non-leap year', () => {
    expect(getPeriodEnd('2025-02-01')).toBe('2025-02-28');
  });

  it('handles February in a leap year', () => {
    expect(getPeriodEnd('2024-02-01')).toBe('2024-02-29');
  });

  it('handles months with 31 days', () => {
    expect(getPeriodEnd('2026-01-01')).toBe('2026-01-31');
    expect(getPeriodEnd('2026-03-01')).toBe('2026-03-31');
    expect(getPeriodEnd('2026-07-01')).toBe('2026-07-31');
  });

  it('handles months with 30 days', () => {
    expect(getPeriodEnd('2026-06-01')).toBe('2026-06-30');
    expect(getPeriodEnd('2026-09-01')).toBe('2026-09-30');
    expect(getPeriodEnd('2026-11-01')).toBe('2026-11-30');
  });
});

// ─── checkUsageLimit ────────────────────────────────────────

describe('checkUsageLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns allowed=true when under limit', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    vi.mocked(getDb).mockReturnValue(
      createMockMeteringDb({ usageRow: { messageCount: 50 } }),
    );

    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => ({
        allowed: true,
        limit: 300,
        used: 50,
        remaining: 250,
      }),
      resolveConfigLimit: async () => null,
    };

    const result = await checkUsageLimit(1, 'whatsapp', deps);

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(50);
    expect(result.limit).toBe(300);
    expect(result.source).toBe('subscription');
    expect(result.periodStart).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('returns allowed=false when at limit', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    vi.mocked(getDb).mockReturnValue(
      createMockMeteringDb({ usageRow: { messageCount: 300 } }),
    );

    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => null,
      resolveConfigLimit: async () => 300,
    };

    const result = await checkUsageLimit(1, 'whatsapp', deps);

    expect(result.allowed).toBe(false);
    expect(result.used).toBe(300);
    expect(result.source).toBe('config');
  });

  it('returns 0 used when no usage row exists', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    vi.mocked(getDb).mockReturnValue(
      createMockMeteringDb({ usageRow: null }),
    );

    const deps: UsageLimitResolverDeps = {
      checkSubscriptionQuota: async () => null,
      resolveConfigLimit: async () => 300,
    };

    const result = await checkUsageLimit(1, 'sms', deps);

    expect(result.used).toBe(0);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(300);
  });
});

// ─── incrementUsage ─────────────────────────────────────────

describe('incrementUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new usage row when none exists', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const mockDb = createMockMeteringDb({ usageRow: null });
    vi.mocked(getDb).mockReturnValue(mockDb);

    const result = await incrementUsage(1, 'whatsapp', 300);

    expect(result.oldCount).toBe(0);
    expect(result.newCount).toBe(1);
    expect(mockDb._insertCalled).toBe(true);
  });

  it('increments an existing usage row', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const mockDb = createMockMeteringDb({
      usageRow: { id: 10, messageCount: 50 },
    });
    vi.mocked(getDb).mockReturnValue(mockDb);

    const result = await incrementUsage(1, 'whatsapp', 300);

    expect(result.oldCount).toBe(50);
    expect(result.newCount).toBe(51);
    expect(mockDb._updateCalled).toBe(true);
  });

  it('emits warning event exactly once when crossing 80% threshold', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const { eventBus } = await import('@oven/module-registry');

    // At 239 messages with limit 300 — crossing 80% (240)
    const mockDb = createMockMeteringDb({
      usageRow: { id: 10, messageCount: 239 },
    });
    vi.mocked(getDb).mockReturnValue(mockDb);

    const result = await incrementUsage(1, 'whatsapp', 300, 80);

    expect(result.warningEmitted).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.USAGE_LIMIT_WARNING,
      expect.objectContaining({
        tenantId: 1,
        channelType: 'whatsapp',
        used: 240,
        limit: 300,
        percentage: 80,
      }),
    );
  });

  it('does NOT re-emit warning after already past threshold', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const { eventBus } = await import('@oven/module-registry');

    // At 250 messages — already past 80%, no crossing
    const mockDb = createMockMeteringDb({
      usageRow: { id: 10, messageCount: 250 },
    });
    vi.mocked(getDb).mockReturnValue(mockDb);

    const result = await incrementUsage(1, 'whatsapp', 300, 80);

    expect(result.warningEmitted).toBe(false);
    const warningCalls = vi
      .mocked(eventBus.emit)
      .mock.calls.filter((c) => c[0] === NOTIFICATION_EVENTS.USAGE_LIMIT_WARNING);
    expect(warningCalls).toHaveLength(0);
  });

  it('emits limit-exceeded event exactly once when crossing 100%', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const { eventBus } = await import('@oven/module-registry');

    // At 299 messages with limit 300 — crossing 100%
    const mockDb = createMockMeteringDb({
      usageRow: { id: 10, messageCount: 299 },
    });
    vi.mocked(getDb).mockReturnValue(mockDb);

    const result = await incrementUsage(1, 'whatsapp', 300);

    expect(result.limitExceededEmitted).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.USAGE_LIMIT_EXCEEDED,
      expect.objectContaining({
        tenantId: 1,
        channelType: 'whatsapp',
        used: 300,
        limit: 300,
      }),
    );
  });

  it('does NOT re-emit limit-exceeded after already past limit', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const { eventBus } = await import('@oven/module-registry');

    // At 310 messages — already past limit
    const mockDb = createMockMeteringDb({
      usageRow: { id: 10, messageCount: 310 },
    });
    vi.mocked(getDb).mockReturnValue(mockDb);

    const result = await incrementUsage(1, 'whatsapp', 300);

    expect(result.limitExceededEmitted).toBe(false);
    const exceededCalls = vi
      .mocked(eventBus.emit)
      .mock.calls.filter((c) => c[0] === NOTIFICATION_EVENTS.USAGE_LIMIT_EXCEEDED);
    expect(exceededCalls).toHaveLength(0);
  });

  it('emits both warning and exceeded when limit <= warning threshold', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const { eventBus } = await import('@oven/module-registry');

    // Small limit: 1 message, crossing both warning (80% of 1 = 0) and limit
    const mockDb = createMockMeteringDb({
      usageRow: { id: 10, messageCount: 0 },
    });
    vi.mocked(getDb).mockReturnValue(mockDb);

    const result = await incrementUsage(1, 'sms', 1, 80);

    expect(result.warningEmitted).toBe(true);
    expect(result.limitExceededEmitted).toBe(true);
    expect(eventBus.emit).toHaveBeenCalledTimes(2);
  });

  it('does not emit events when limit is 0', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const { eventBus } = await import('@oven/module-registry');

    const mockDb = createMockMeteringDb({ usageRow: null });
    vi.mocked(getDb).mockReturnValue(mockDb);

    const result = await incrementUsage(1, 'whatsapp', 0);

    expect(result.warningEmitted).toBe(false);
    expect(result.limitExceededEmitted).toBe(false);
    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});

// ─── Mock DB helper ─────────────────────────────────────────

function createMockMeteringDb(opts: {
  usageRow: { id?: number; messageCount: number } | null;
}) {
  const db: Record<string, unknown> & {
    _insertCalled: boolean;
    _updateCalled: boolean;
  } = {
    _insertCalled: false,
    _updateCalled: false,
    select: () => db,
    from: () => db,
    where: () => db,
    limit: () =>
      Promise.resolve(
        opts.usageRow
          ? [{ id: opts.usageRow.id ?? 1, messageCount: opts.usageRow.messageCount }]
          : [],
      ),
    insert: () => {
      db._insertCalled = true;
      return db;
    },
    update: () => {
      db._updateCalled = true;
      return db;
    },
    set: () => db,
    values: () => db,
    returning: () => Promise.resolve([{ id: 1 }]),
  };

  return db;
}
