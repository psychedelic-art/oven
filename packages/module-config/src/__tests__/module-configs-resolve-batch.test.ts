import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ───────────────────────────────────────────────────────────────
// Same pattern as module-configs-resolve.test.ts — hoisted to satisfy
// vi.mock()'s hoisting requirements. The batch handler consumes successive
// `.where()` results directly via `await db.select().from().where()` rather
// than via `.limit(1)`, so the thenable branch of the chain is what matters.
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

// Import AFTER mocks so the handler picks them up.
import { GET } from '../api/module-configs-resolve-batch.handler';

function makeRequest(query: Record<string, string | undefined>): NextRequest {
  const url = new URL('http://localhost/api/module-configs/resolve-batch');
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

// Helper for building a row as the batch handler expects to read it.
function row(partial: {
  key: string;
  value: unknown;
  scope?: 'module' | 'instance';
  scopeId?: string | null;
}) {
  return {
    key: partial.key,
    value: partial.value,
    scope: partial.scope ?? 'module',
    scopeId: partial.scopeId ?? null,
  };
}

describe('module-configs-resolve-batch.handler', () => {
  beforeEach(() => {
    resetDb();
    mockGetModule.mockReset();
    mockWhere.mockClear();
    mockFrom.mockClear();
    mockSelect.mockClear();
  });

  describe('bad request paths', () => {
    it('returns 400 when moduleName is missing', async () => {
      const res = await GET(makeRequest({ keys: 'A,B' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when keys is missing', async () => {
      const res = await GET(makeRequest({ moduleName: 'notifications' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when keys is an empty string', async () => {
      const res = await GET(makeRequest({ moduleName: 'notifications', keys: '' }));
      expect(res.status).toBe(400);
    });

    it('returns 400 when keys collapses to nothing after trim', async () => {
      const res = await GET(
        makeRequest({ moduleName: 'notifications', keys: '  ,  ,,' })
      );
      expect(res.status).toBe(400);
    });
  });

  describe('tier 2 — tenant-module hits', () => {
    it('resolves one key at tier 2 and leaves the other as default', async () => {
      // Tenant query returns one matching row for K1.
      enqueueRows([row({ key: 'K1', value: 500 })]);
      // Platform query: nothing.
      enqueueRows([]);
      mockGetModule.mockReturnValue({ configSchema: [] });

      const res = await GET(
        makeRequest({ moduleName: 'notifications', keys: 'K1,K2', tenantId: '42' })
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results.K1).toEqual({ value: 500, source: 'tenant-module' });
      expect(body.results.K2).toEqual({ value: null, source: 'default' });
    });

    it('ignores tenant rows with scope=instance', async () => {
      // A tenant-instance row would live at tier 1, which batch does not support.
      // The handler must skip it even though it comes back from the tenant query.
      enqueueRows([row({ key: 'K1', value: 800, scope: 'instance', scopeId: 'X' })]);
      // Platform query empty.
      enqueueRows([]);
      mockGetModule.mockReturnValue({ configSchema: [] });

      const res = await GET(
        makeRequest({ moduleName: 'notifications', keys: 'K1', tenantId: '42' })
      );

      const body = await res.json();
      expect(body.results.K1).toEqual({ value: null, source: 'default' });
    });
  });

  describe('tier 4 — platform-module hits', () => {
    it('falls back to platform-module when tenant query misses', async () => {
      enqueueRows([]); // tenant query empty
      enqueueRows([row({ key: 'K2', value: 200 })]); // platform query
      mockGetModule.mockReturnValue({ configSchema: [] });

      const res = await GET(
        makeRequest({ moduleName: 'notifications', keys: 'K2', tenantId: '42' })
      );

      const body = await res.json();
      expect(body.results.K2).toEqual({ value: 200, source: 'platform-module' });
    });

    it('only issues the platform query when there is no tenantId', async () => {
      // No tenantId → the handler skips the tenant query block entirely.
      enqueueRows([row({ key: 'K', value: 200 })]); // this is the platform query
      mockGetModule.mockReturnValue({ configSchema: [] });

      const res = await GET(makeRequest({ moduleName: 'notifications', keys: 'K' }));

      const body = await res.json();
      expect(body.results.K).toEqual({ value: 200, source: 'platform-module' });
      expect(mockWhere).toHaveBeenCalledTimes(1);
    });
  });

  describe('tier 5 — schema defaults', () => {
    it('returns schema default when neither tenant nor platform has the key', async () => {
      enqueueRows([]); // tenant query empty
      enqueueRows([]); // platform query empty
      mockGetModule.mockReturnValue({
        configSchema: [{ key: 'K', defaultValue: 'FALLBACK', type: 'string' }],
      });

      const res = await GET(
        makeRequest({ moduleName: 'notifications', keys: 'K', tenantId: '42' })
      );

      const body = await res.json();
      expect(body.results.K).toEqual({ value: 'FALLBACK', source: 'schema' });
    });

    it('returns default when schema exists but has no matching entry', async () => {
      enqueueRows([]); // tenant
      enqueueRows([]); // platform
      mockGetModule.mockReturnValue({
        configSchema: [{ key: 'OTHER', defaultValue: 1, type: 'number' }],
      });

      const res = await GET(
        makeRequest({ moduleName: 'notifications', keys: 'K', tenantId: '42' })
      );

      const body = await res.json();
      expect(body.results.K).toEqual({ value: null, source: 'default' });
    });
  });

  describe('mixed resolution', () => {
    it('resolves K1 at tier 2, K2 at tier 4, K3 at tier 5, K4 as default', async () => {
      // Tenant query: K1 at tier 2.
      enqueueRows([row({ key: 'K1', value: 500 })]);
      // Platform query: K2 at tier 4.
      enqueueRows([row({ key: 'K2', value: 200 })]);
      // Schema: K3 has a default.
      mockGetModule.mockReturnValue({
        configSchema: [{ key: 'K3', defaultValue: 'schema-val', type: 'string' }],
      });

      const res = await GET(
        makeRequest({
          moduleName: 'notifications',
          keys: 'K1, K2 , K3 , K4 ',
          tenantId: '42',
        })
      );

      const body = await res.json();
      expect(body.results.K1).toEqual({ value: 500, source: 'tenant-module' });
      expect(body.results.K2).toEqual({ value: 200, source: 'platform-module' });
      expect(body.results.K3).toEqual({ value: 'schema-val', source: 'schema' });
      expect(body.results.K4).toEqual({ value: null, source: 'default' });
    });
  });
});
