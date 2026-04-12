import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { selectResultQueue, insertResultQueue, mockEventEmit } =
  vi.hoisted(() => {
    const selectResultQueue: unknown[][] = [];
    const insertResultQueue: unknown[][] = [];
    const mockEventEmit = vi.fn();
    return { selectResultQueue, insertResultQueue, mockEventEmit };
  });

function makeChainableSelect() {
  const terminal = () => Promise.resolve(selectResultQueue.shift() ?? []);
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(terminal),
    then: (resolve: (v: unknown) => void) => terminal().then(resolve),
  };
  return chain;
}

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => makeChainableSelect()),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(insertResultQueue.shift() ?? [])),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry/api-utils', async () => {
  const { NextResponse } = await import('next/server');
  return {
    parseListParams: vi.fn((req: NextRequest) => ({
      sort: 'id',
      order: 'asc',
      limit: 25,
      offset: 0,
      filter: Object.fromEntries(new URL(req.url).searchParams.entries()),
    })),
    listResponse: vi.fn((data: unknown[], resource: string, params: unknown, total: number) =>
      NextResponse.json({ data, total })
    ),
  };
});

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: mockEventEmit },
}));

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(vi.fn(() => 'count_expr'), { raw: vi.fn() }),
  asc: vi.fn(() => 'asc'),
  desc: vi.fn(() => 'desc'),
  eq: vi.fn(),
  and: vi.fn(),
  ilike: vi.fn(),
}));

vi.mock('../../schema', () => ({
  uiFlows: { id: 'id', tenantId: 'tenant_id', status: 'status', enabled: 'enabled', name: 'name' },
  uiFlowPages: { uiFlowId: 'ui_flow_id', tenantId: 'tenant_id', slug: 'slug' },
}));

vi.mock('../../slug-utils', () => ({
  normalizeFlowSlug: vi.fn((s: string) => s),
  normalizePageSlug: vi.fn((s: string) => s),
}));

import { GET, POST } from '../../api/ui-flows.handler';

describe('ui-flows.handler', () => {
  beforeEach(() => {
    selectResultQueue.length = 0;
    insertResultQueue.length = 0;
    vi.clearAllMocks();
  });

  describe('GET /api/ui-flows', () => {
    it('returns a list response with data and total', async () => {
      const rows = [{ id: 1, tenantId: 1, name: 'Flow 1' }];
      selectResultQueue.push(rows);
      selectResultQueue.push([{ count: 1 }]);

      const req = new NextRequest('http://localhost/api/ui-flows');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(rows);
      expect(body.total).toBe(1);
    });

    it('returns empty list when no flows exist', async () => {
      selectResultQueue.push([]);
      selectResultQueue.push([{ count: 0 }]);

      const req = new NextRequest('http://localhost/api/ui-flows');
      const res = await GET(req);
      const body = await res.json();
      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('applies tenantId filter from query params', async () => {
      selectResultQueue.push([{ id: 1, tenantId: 5 }]);
      selectResultQueue.push([{ count: 1 }]);

      const req = new NextRequest('http://localhost/api/ui-flows?tenantId=5');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/ui-flows', () => {
    it('creates a flow and returns 201', async () => {
      const created = { id: 1, tenantId: 1, name: 'New Portal', slug: 'new-portal', definition: { pages: [] } };
      insertResultQueue.push([created]);

      const req = new NextRequest('http://localhost/api/ui-flows', {
        method: 'POST',
        body: JSON.stringify({ tenantId: 1, name: 'New Portal', slug: 'new-portal' }),
        headers: { 'content-type': 'application/json' },
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe(1);
    });

    it('emits ui-flows.flow.created event', async () => {
      const created = { id: 2, tenantId: 1, name: 'Portal', slug: 'portal', definition: { pages: [] } };
      insertResultQueue.push([created]);

      const req = new NextRequest('http://localhost/api/ui-flows', {
        method: 'POST',
        body: JSON.stringify({ tenantId: 1, name: 'Portal', slug: 'portal' }),
        headers: { 'content-type': 'application/json' },
      });
      await POST(req);
      expect(mockEventEmit).toHaveBeenCalledWith(
        'ui-flows.flow.created',
        expect.objectContaining({ id: 2, tenantId: 1 })
      );
    });
  });
});
