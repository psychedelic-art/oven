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

import { GET } from '../../api/portal-resolve.handler';

function makeContext(tenantSlug: string) {
  return { params: Promise.resolve({ tenantSlug }) };
}

describe('portal-resolve.handler', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    vi.clearAllMocks();
  });

  it('resolves a published portal for a tenant', async () => {
    const tenant = { id: 1, name: 'Test Tenant', slug: 'test' };
    const flow = { id: 10, tenantId: 1, definition: { pages: [] }, themeConfig: { color: 'blue' }, domainConfig: null };
    selectQueue.push([tenant]);
    selectQueue.push([flow]);

    const req = new NextRequest('http://localhost/api/portal/test');
    const res = await GET(req, makeContext('test'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.definition).toEqual({ pages: [] });
    expect(body.theme).toEqual({ color: 'blue' });
    expect(body.tenantName).toBe('Test Tenant');
  });

  it('returns 404 when tenant not found', async () => {
    selectQueue.push([]);

    const req = new NextRequest('http://localhost/api/portal/unknown');
    const res = await GET(req, makeContext('unknown'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('Tenant');
  });

  it('returns 404 when no published portal exists', async () => {
    selectQueue.push([{ id: 1, name: 'Tenant', slug: 'test' }]);
    selectQueue.push([]); // no published flow

    const req = new NextRequest('http://localhost/api/portal/test');
    const res = await GET(req, makeContext('test'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('published');
  });

  it('does not resolve a different tenant portal (tenant isolation)', async () => {
    const tenant1 = { id: 1, name: 'Tenant 1', slug: 'tenant-1' };
    selectQueue.push([tenant1]);
    selectQueue.push([]); // no flow for this tenant

    const req = new NextRequest('http://localhost/api/portal/tenant-1');
    const res = await GET(req, makeContext('tenant-1'));
    expect(res.status).toBe(404);
  });
});
