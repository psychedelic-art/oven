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
    parseListParams: vi.fn(() => ({
      sort: 'version',
      order: 'desc',
      limit: 25,
      offset: 0,
      filter: {},
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
}));

vi.mock('../../schema', () => ({
  uiFlowVersions: { uiFlowId: 'ui_flow_id', version: 'version' },
}));

import { GET } from '../../api/ui-flows-versions.handler';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('ui-flows-versions.handler', () => {
  beforeEach(() => {
    selectResultQueue.length = 0;
    vi.clearAllMocks();
  });

  it('returns versions list for a flow', async () => {
    const versions = [
      { id: 1, uiFlowId: 10, version: 2, definition: {} },
      { id: 2, uiFlowId: 10, version: 1, definition: {} },
    ];
    selectResultQueue.push(versions);
    selectResultQueue.push([{ count: 2 }]);

    const req = new NextRequest('http://localhost/api/ui-flows/10/versions');
    const res = await GET(req, makeContext('10'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it('returns empty list when no versions exist', async () => {
    selectResultQueue.push([]);
    selectResultQueue.push([{ count: 0 }]);

    const req = new NextRequest('http://localhost/api/ui-flows/10/versions');
    const res = await GET(req, makeContext('10'));
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });
});
