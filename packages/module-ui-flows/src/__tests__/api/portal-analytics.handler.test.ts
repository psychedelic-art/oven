import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { selectQueue, insertQueue, mockEventEmit } =
  vi.hoisted(() => {
    const selectQueue: unknown[][] = [];
    const insertQueue: unknown[][] = [];
    const mockEventEmit = vi.fn();
    return { selectQueue, insertQueue, mockEventEmit };
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
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(insertQueue.shift() ?? [])),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry/api-utils', async () => {
  const { NextResponse } = await import('next/server');
  return {
    notFound: (msg: string) => NextResponse.json({ error: msg }, { status: 404 }),
    badRequest: (msg: string) => NextResponse.json({ error: msg }, { status: 400 }),
  };
});

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: mockEventEmit },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('../../schema', () => ({
  uiFlows: { tenantId: 'tenant_id', status: 'status', enabled: 'enabled' },
  uiFlowAnalytics: {},
}));

vi.mock('@oven/module-tenants/schema', () => ({
  tenants: { slug: 'slug' },
}));

import { POST } from '../../api/portal-analytics.handler';

function makeContext(tenantSlug: string) {
  return { params: Promise.resolve({ tenantSlug }) };
}

function makeRequest(body: unknown, tenantSlug = 'test'): NextRequest {
  return new NextRequest(`http://localhost/api/portal/${tenantSlug}/analytics`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('portal-analytics.handler', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    insertQueue.length = 0;
    vi.clearAllMocks();
  });

  it('records a page_view event and returns 201', async () => {
    selectQueue.push([{ id: 1, name: 'Tenant', slug: 'test' }]);
    selectQueue.push([{ id: 10, tenantId: 1 }]);
    const record = { id: 1, uiFlowId: 10, tenantId: 1, pageSlug: 'home', eventType: 'page_view' };
    insertQueue.push([record]);

    const res = await POST(
      makeRequest({ pageSlug: 'home', eventType: 'page_view', visitorId: 'v1' }),
      makeContext('test')
    );
    expect(res.status).toBe(201);
  });

  it('emits ui-flows.page.visited for page_view events', async () => {
    selectQueue.push([{ id: 1, name: 'T', slug: 'test' }]);
    selectQueue.push([{ id: 10, tenantId: 1 }]);
    insertQueue.push([{ id: 1 }]);

    await POST(
      makeRequest({ pageSlug: 'about', eventType: 'page_view' }),
      makeContext('test')
    );
    expect(mockEventEmit).toHaveBeenCalledWith(
      'ui-flows.page.visited',
      expect.objectContaining({ uiFlowId: 10, pageSlug: 'about' })
    );
  });

  it('emits ui-flows.form.submitted for form_submit events', async () => {
    selectQueue.push([{ id: 1, name: 'T', slug: 'test' }]);
    selectQueue.push([{ id: 10, tenantId: 1 }]);
    insertQueue.push([{ id: 2 }]);

    await POST(
      makeRequest({ pageSlug: 'contact', eventType: 'form_submit', metadata: { formId: 5 } }),
      makeContext('test')
    );
    expect(mockEventEmit).toHaveBeenCalledWith(
      'ui-flows.form.submitted',
      expect.objectContaining({ formId: 5 })
    );
  });

  it('returns 400 when pageSlug is missing', async () => {
    const res = await POST(
      makeRequest({ eventType: 'page_view' }),
      makeContext('test')
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when eventType is missing', async () => {
    const res = await POST(
      makeRequest({ pageSlug: 'home' }),
      makeContext('test')
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when tenant not found', async () => {
    selectQueue.push([]);

    const res = await POST(
      makeRequest({ pageSlug: 'home', eventType: 'page_view' }, 'missing'),
      makeContext('missing')
    );
    expect(res.status).toBe(404);
  });

  it('isolates analytics by tenant — different tenant cannot record', async () => {
    selectQueue.push([{ id: 2, name: 'Other', slug: 'other' }]);
    selectQueue.push([]); // no published flow for this tenant

    const res = await POST(
      makeRequest({ pageSlug: 'home', eventType: 'page_view' }, 'other'),
      makeContext('other')
    );
    expect(res.status).toBe(404);
  });
});
