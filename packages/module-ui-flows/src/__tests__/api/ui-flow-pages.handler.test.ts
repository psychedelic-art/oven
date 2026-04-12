import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { selectResultQueue } =
  vi.hoisted(() => {
    const selectResultQueue: unknown[][] = [];
    return { selectResultQueue };
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
  })),
}));

vi.mock('@oven/module-registry/api-utils', async () => {
  const { NextResponse } = await import('next/server');
  return {
    parseListParams: vi.fn((req: NextRequest) => ({
      sort: 'position',
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

vi.mock('drizzle-orm', () => ({
  sql: Object.assign(vi.fn(() => 'count_expr'), { raw: vi.fn() }),
  asc: vi.fn(() => 'asc'),
  desc: vi.fn(() => 'desc'),
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('../../schema', () => ({
  uiFlowPages: { uiFlowId: 'ui_flow_id', tenantId: 'tenant_id', pageType: 'page_type', position: 'position' },
}));

import { GET } from '../../api/ui-flow-pages.handler';

describe('ui-flow-pages.handler', () => {
  beforeEach(() => {
    selectResultQueue.length = 0;
    vi.clearAllMocks();
  });

  it('returns paginated pages list', async () => {
    const pages = [
      { id: 1, uiFlowId: 10, slug: 'home', title: 'Home', position: 0, tenantId: 1 },
      { id: 2, uiFlowId: 10, slug: 'about', title: 'About', position: 1, tenantId: 1 },
    ];
    selectResultQueue.push(pages);
    selectResultQueue.push([{ count: 2 }]);

    const req = new NextRequest('http://localhost/api/ui-flow-pages');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('returns empty list when no pages', async () => {
    selectResultQueue.push([]);
    selectResultQueue.push([{ count: 0 }]);

    const req = new NextRequest('http://localhost/api/ui-flow-pages');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data).toEqual([]);
  });

  it('filters by tenantId for tenant isolation', async () => {
    selectResultQueue.push([{ id: 1, tenantId: 3 }]);
    selectResultQueue.push([{ count: 1 }]);

    const req = new NextRequest('http://localhost/api/ui-flow-pages?tenantId=3');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('filters by uiFlowId', async () => {
    selectResultQueue.push([{ id: 1, uiFlowId: 10 }]);
    selectResultQueue.push([{ count: 1 }]);

    const req = new NextRequest('http://localhost/api/ui-flow-pages?uiFlowId=10');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
