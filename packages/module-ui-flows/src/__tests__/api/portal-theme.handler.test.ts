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
}));

vi.mock('@oven/module-tenants/schema', () => ({
  tenants: { slug: 'slug' },
}));

import { GET } from '../../api/portal-theme.handler';

function makeContext(tenantSlug: string) {
  return { params: Promise.resolve({ tenantSlug }) };
}

describe('portal-theme.handler', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    vi.clearAllMocks();
  });

  it('returns theme config for a published portal', async () => {
    selectQueue.push([{ id: 1, name: 'Tenant', slug: 'test' }]);
    selectQueue.push([{ id: 10, themeConfig: { primaryColor: '#FF0000' } }]);

    const req = new NextRequest('http://localhost/api/portal/test/theme');
    const res = await GET(req, makeContext('test'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theme).toEqual({ primaryColor: '#FF0000' });
    expect(body.tenantName).toBe('Tenant');
  });

  it('returns empty object when themeConfig is null', async () => {
    selectQueue.push([{ id: 1, name: 'Tenant', slug: 'test' }]);
    selectQueue.push([{ id: 10, themeConfig: null }]);

    const req = new NextRequest('http://localhost/api/portal/test/theme');
    const res = await GET(req, makeContext('test'));
    const body = await res.json();
    expect(body.theme).toEqual({});
  });

  it('returns 404 when tenant not found', async () => {
    selectQueue.push([]);

    const req = new NextRequest('http://localhost/api/portal/missing/theme');
    const res = await GET(req, makeContext('missing'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when no published portal', async () => {
    selectQueue.push([{ id: 1, name: 'T', slug: 'test' }]);
    selectQueue.push([]);

    const req = new NextRequest('http://localhost/api/portal/test/theme');
    const res = await GET(req, makeContext('test'));
    expect(res.status).toBe(404);
  });
});
