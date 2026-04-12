import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { selectQueue } =
  vi.hoisted(() => {
    const selectQueue: unknown[][] = [];
    return { selectQueue };
  });

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
        })),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry/api-utils', async () => {
  const { NextResponse } = await import('next/server');
  return {
    notFound: (msg: string) => NextResponse.json({ error: msg }, { status: 404 }),
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('../../schema', () => ({
  uiFlows: { tenantId: 'tenant_id', status: 'status', enabled: 'enabled' },
  uiFlowPages: { uiFlowId: 'ui_flow_id', slug: 'slug', enabled: 'enabled' },
}));

vi.mock('@oven/module-tenants/schema', () => ({
  tenants: { slug: 'slug' },
}));

vi.mock('../../slug-utils', () => ({
  urlSegmentToPageSlug: vi.fn((s: string) => s === '_home' ? '' : s),
}));

import { GET } from '../../api/portal-page.handler';

function makeContext(tenantSlug: string, pageSlug: string) {
  return { params: Promise.resolve({ tenantSlug, pageSlug }) };
}

describe('portal-page.handler', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    vi.clearAllMocks();
  });

  it('resolves a page for a published portal', async () => {
    const tenant = { id: 1, name: 'Tenant', slug: 'test' };
    const flow = { id: 10, tenantId: 1, definition: { pages: [{ slug: 'about', title: 'About' }] }, themeConfig: { color: 'red' } };
    const page = { id: 100, uiFlowId: 10, slug: 'about', title: 'About', pageType: 'content' };
    selectQueue.push([tenant]);
    selectQueue.push([flow]);
    selectQueue.push([page]);

    const req = new NextRequest('http://localhost/api/portal/test/pages/about');
    const res = await GET(req, makeContext('test', 'about'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page.title).toBe('About');
    expect(body.theme).toEqual({ color: 'red' });
    expect(body.tenantName).toBe('Tenant');
  });

  it('returns 404 when tenant not found', async () => {
    selectQueue.push([]);

    const req = new NextRequest('http://localhost/api/portal/missing/pages/home');
    const res = await GET(req, makeContext('missing', 'home'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when no published portal', async () => {
    selectQueue.push([{ id: 1, name: 'T', slug: 'test' }]);
    selectQueue.push([]);

    const req = new NextRequest('http://localhost/api/portal/test/pages/home');
    const res = await GET(req, makeContext('test', 'home'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when page not found', async () => {
    selectQueue.push([{ id: 1, name: 'T', slug: 'test' }]);
    selectQueue.push([{ id: 10, tenantId: 1, definition: { pages: [] }, themeConfig: null }]);
    selectQueue.push([]); // page not found

    const req = new NextRequest('http://localhost/api/portal/test/pages/missing');
    const res = await GET(req, makeContext('test', 'missing'));
    expect(res.status).toBe(404);
  });

  it('isolates pages by tenant — different tenant pages not accessible', async () => {
    selectQueue.push([{ id: 2, name: 'Other', slug: 'other' }]);
    selectQueue.push([]); // no published flow for this tenant

    const req = new NextRequest('http://localhost/api/portal/other/pages/secret');
    const res = await GET(req, makeContext('other', 'secret'));
    expect(res.status).toBe(404);
  });
});
