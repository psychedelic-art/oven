/**
 * Shared mock helpers for ui-flows API handler tests.
 * Reuses the Drizzle mock pattern from packages/module-ai/src/__tests__/*.
 */
import { vi } from 'vitest';
import { NextRequest } from 'next/server';

// Chainable mock DB builder
export function createMockDb() {
  const resultQueues: Map<string, unknown[][]> = new Map();
  const insertResultQueues: unknown[][] = [];

  function dequeue(key: string): unknown[] {
    const queue = resultQueues.get(key);
    return queue?.shift() ?? [];
  }

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(function (this: any) {
      return {
        limit: vi.fn(() => Promise.resolve(dequeue('select'))),
        orderBy: vi.fn().mockReturnThis(),
        offset: vi.fn(() => Promise.resolve(dequeue('select'))),
        then: (resolve: (v: unknown) => void) => resolve(dequeue('select')),
      };
    }),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn(function () {
      return Promise.resolve(dequeue('select'));
    }),
    offset: vi.fn(function () {
      return Promise.resolve(dequeue('select'));
    }),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(() => Promise.resolve(insertResultQueues.shift() ?? [])),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),

    // Queue management
    _enqueueSelect(rows: unknown[]) {
      if (!resultQueues.has('select')) resultQueues.set('select', []);
      resultQueues.get('select')!.push(rows);
    },
    _enqueueInsert(rows: unknown[]) {
      insertResultQueues.push(rows);
    },
    _reset() {
      resultQueues.clear();
      insertResultQueues.length = 0;
      vi.clearAllMocks();
    },
  };

  return mockDb;
}

export function makeRequest(
  url: string,
  method = 'GET',
  body?: unknown
): NextRequest {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'content-type': 'application/json' };
  }
  return new NextRequest(url, init);
}

export function makeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export const TENANT_1 = {
  id: 1,
  name: 'Test Tenant',
  slug: 'test-tenant',
};

export const TENANT_2 = {
  id: 2,
  name: 'Other Tenant',
  slug: 'other-tenant',
};

export const FLOW_1 = {
  id: 10,
  tenantId: 1,
  name: 'My Portal',
  slug: 'my-portal',
  description: 'A test portal',
  definition: { pages: [{ slug: 'home', title: 'Home', type: 'content' }], navigation: { type: 'top-bar', items: [] }, routing: { defaultPage: 'home' }, footer: { enabled: false } },
  themeConfig: { primaryColor: '#1976D2' },
  domainConfig: { subdomain: 'test' },
  status: 'draft',
  version: 1,
  enabled: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const FLOW_PUBLISHED = {
  ...FLOW_1,
  id: 11,
  status: 'published',
  version: 2,
};

export const PAGE_1 = {
  id: 100,
  uiFlowId: 10,
  tenantId: 1,
  slug: 'home',
  title: 'Home',
  pageType: 'content',
  formId: null,
  config: null,
  position: 0,
  enabled: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};
