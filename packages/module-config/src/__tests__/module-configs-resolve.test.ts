import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────
// vi.mock() calls are hoisted. Variables they reference must also be hoisted,
// so we declare them in a vi.hoisted() block to guarantee initialisation
// before the mock factories run.
const { dbResultQueue, mockWhere, mockFrom, mockSelect, mockGetModule } =
  vi.hoisted(() => {
    const dbResultQueue: unknown[][] = [];
    const mockWhere = vi.fn(() => {
      const next = dbResultQueue.shift() ?? [];
      const obj = {
        limit: vi.fn(() => Promise.resolve(next)),
        then: (
          onFulfilled: (value: unknown[]) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) => Promise.resolve(next).then(onFulfilled, onRejected),
      };
      return obj;
    });
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    const mockSelect = vi.fn(() => ({ from: mockFrom }));
    const mockGetModule = vi.fn();
    return { dbResultQueue, mockWhere, mockFrom, mockSelect, mockGetModule };
  });

function resetDb(): void {
  dbResultQueue.length = 0;
}

function enqueueRows(rows: unknown[]): void {
  dbResultQueue.push(rows);
}

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({ select: mockSelect })),
}));

vi.mock('@oven/module-registry', () => ({
  registry: { getModule: mockGetModule },
}));

// drizzle-orm operators are passthroughs — the where() mock ignores its args.
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ op: 'eq', col, val })),
  and: vi.fn((...conds: unknown[]) => ({ op: 'and', conds })),
  isNull: vi.fn((col: unknown) => ({ op: 'isNull', col })),
  inArray: vi.fn((col: unknown, vals: unknown[]) => ({ op: 'inArray', col, vals })),
}));

vi.mock('../schema', () => ({
  moduleConfigs: {
    id: 'id',
    tenantId: 'tenant_id',
    moduleName: 'module_name',
    scope: 'scope',
    scopeId: 'scope_id',
    key: 'key',
  },
}));

// Use the real badRequest helper (it returns a real NextResponse).

// Import AFTER mocks so the handler picks them up.
import { GET } from '../api/module-configs-resolve.handler';

function makeRequest(query: Record<string, string | undefined>): NextRequest {
  const url = new URL('http://localhost/api/module-configs/resolve');
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe('module-configs-resolve.handler', () => {
  beforeEach(() => {
    resetDb();
    mockGetModule.mockReset();
    mockWhere.mockClear();
    mockFrom.mockClear();
    mockSelect.mockClear();
  });

  describe('bad request paths', () => {
    it('returns 400 when moduleName is missing', async () => {
      const res = await GET(makeRequest({ key: 'K' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/required/i);
    });

    it('returns 400 when key is missing', async () => {
      const res = await GET(makeRequest({ moduleName: 'notifications' }));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/required/i);
    });

    it('does not hit the database when params are missing', async () => {
      await GET(makeRequest({}));
      expect(mockSelect).not.toHaveBeenCalled();
    });
  });

  describe('tier 1 — tenant instance', () => {
    it('returns tenant-instance when a matching tier-1 row exists', async () => {
      enqueueRows([{ value: 800, key: 'DAILY_SEND_LIMIT' }]); // tier 1 hit

      const res = await GET(
        makeRequest({
          moduleName: 'notifications',
          key: 'DAILY_SEND_LIMIT',
          tenantId: '42',
          scopeId: 'channel:sede-norte',
        })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.source).toBe('tenant-instance');
      expect(body.value).toBe(800);
      expect(body.tenantId).toBe(42);
      expect(body.scopeId).toBe('channel:sede-norte');
    });

    it('short-circuits — only one db query when tier 1 hits', async () => {
      enqueueRows([{ value: 800, key: 'K' }]);
      // Seed tier 2 too; should NOT be consumed.
      enqueueRows([{ value: 500, key: 'K' }]);

      await GET(
        makeRequest({
          moduleName: 'notifications',
          key: 'K',
          tenantId: '42',
          scopeId: 'channel:north',
        })
      );

      expect(mockWhere).toHaveBeenCalledTimes(1);
      // Second queue item is still present — tier 2 was not queried.
      expect(dbResultQueue.length).toBe(1);
    });
  });

  describe('tier 2 — tenant module default', () => {
    it('returns tenant-module when no scopeId is provided and a tier-2 row exists', async () => {
      enqueueRows([{ value: 500, key: 'K' }]); // tier 2 hit (tier 1 skipped because no scopeId)

      const res = await GET(
        makeRequest({ moduleName: 'notifications', key: 'K', tenantId: '42' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.source).toBe('tenant-module');
      expect(body.value).toBe(500);
      expect(body.tenantId).toBe(42);
      expect(body.scopeId).toBeNull();
    });

    it('wins over tier 3/4/5', async () => {
      enqueueRows([{ value: 500, key: 'K' }]); // tier 2
      enqueueRows([{ value: 300, key: 'K' }]); // tier 4 — should NOT be read

      await GET(
        makeRequest({ moduleName: 'notifications', key: 'K', tenantId: '42' })
      );

      // Tier 2 consumed one where() call. Tier 3 skipped (no scopeId).
      // Tier 4 never queried.
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(dbResultQueue.length).toBe(1);
    });
  });

  describe('tier 3 — platform instance override', () => {
    it('returns platform-instance when no tenantId and a tier-3 row exists', async () => {
      // No tenantId → tier 1 + tier 2 skipped. Scopeid present → tier 3 queried.
      enqueueRows([{ value: 101, key: 'K' }]); // tier 3 hit

      const res = await GET(
        makeRequest({ moduleName: 'notifications', key: 'K', scopeId: 'inst-7' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.source).toBe('platform-instance');
      expect(body.value).toBe(101);
      expect(body.tenantId).toBeNull();
      expect(body.scopeId).toBe('inst-7');
    });
  });

  describe('tier 4 — platform module default', () => {
    it('returns platform-module when everything else is empty', async () => {
      // No tenantId, no scopeId → tiers 1-3 skipped. Tier 4 is the first query.
      enqueueRows([{ value: 200, key: 'K' }]); // tier 4 hit

      const res = await GET(
        makeRequest({ moduleName: 'notifications', key: 'K' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.source).toBe('platform-module');
      expect(body.value).toBe(200);
      expect(body.tenantId).toBeNull();
      expect(body.scopeId).toBeNull();
    });

    it('falls through to tier 4 after tier 2 misses', async () => {
      enqueueRows([]);                                 // tier 2 miss
      enqueueRows([{ value: 200, key: 'K' }]);         // tier 4 hit

      const res = await GET(
        makeRequest({ moduleName: 'notifications', key: 'K', tenantId: '42' })
      );

      const body = await res.json();
      expect(body.source).toBe('platform-module');
      expect(body.value).toBe(200);
      expect(mockWhere).toHaveBeenCalledTimes(2); // tier 2 + tier 4 (tier 1 + 3 skipped — no scopeId)
    });
  });

  describe('tier 5 — schema default from registry', () => {
    it('returns schema when the module declares the key', async () => {
      enqueueRows([]); // tier 4 miss (tiers 1-3 skipped)
      mockGetModule.mockReturnValue({
        configSchema: [
          { key: 'K', defaultValue: 'fallback', type: 'string' },
        ],
      });

      const res = await GET(
        makeRequest({ moduleName: 'notifications', key: 'K' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.source).toBe('schema');
      expect(body.value).toBe('fallback');
      expect(mockGetModule).toHaveBeenCalledWith('notifications');
    });
  });

  describe('default (nothing matches)', () => {
    it('returns null default when neither rows nor schema have the key', async () => {
      enqueueRows([]); // tier 4 miss
      mockGetModule.mockReturnValue(undefined);

      const res = await GET(
        makeRequest({ moduleName: 'notifications', key: 'K' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.source).toBe('default');
      expect(body.value).toBeNull();
    });

    it('returns null default when module exists but has no matching configSchema entry', async () => {
      enqueueRows([]); // tier 4 miss
      mockGetModule.mockReturnValue({
        configSchema: [{ key: 'OTHER', defaultValue: 'x', type: 'string' }],
      });

      const res = await GET(
        makeRequest({ moduleName: 'notifications', key: 'K' })
      );

      const body = await res.json();
      expect(body.source).toBe('default');
      expect(body.value).toBeNull();
    });
  });
});
