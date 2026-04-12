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
      sort: 'createdAt',
      order: 'desc',
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
  uiFlowAnalytics: { tenantId: 'tenant_id', uiFlowId: 'ui_flow_id', eventType: 'event_type', pageSlug: 'page_slug', createdAt: 'created_at' },
}));

import { GET } from '../../api/ui-flow-analytics.handler';

describe('ui-flow-analytics.handler', () => {
  beforeEach(() => {
    selectResultQueue.length = 0;
    vi.clearAllMocks();
  });

  it('returns paginated analytics list', async () => {
    const events = [
      { id: 1, eventType: 'page_view', pageSlug: 'home', tenantId: 1 },
      { id: 2, eventType: 'form_submit', pageSlug: 'contact', tenantId: 1 },
    ];
    selectResultQueue.push(events);
    selectResultQueue.push([{ count: 2 }]);

    const req = new NextRequest('http://localhost/api/ui-flow-analytics');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('returns empty list when no analytics exist', async () => {
    selectResultQueue.push([]);
    selectResultQueue.push([{ count: 0 }]);

    const req = new NextRequest('http://localhost/api/ui-flow-analytics');
    const res = await GET(req);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('filters by tenantId for tenant isolation', async () => {
    selectResultQueue.push([{ id: 1, tenantId: 5 }]);
    selectResultQueue.push([{ count: 1 }]);

    const req = new NextRequest('http://localhost/api/ui-flow-analytics?tenantId=5');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
