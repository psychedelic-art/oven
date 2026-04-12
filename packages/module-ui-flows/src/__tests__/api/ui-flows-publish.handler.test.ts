import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { selectQueue, insertQueue, updateQueue, mockEventEmit } =
  vi.hoisted(() => {
    const selectQueue: unknown[][] = [];
    const insertQueue: unknown[][] = [];
    const updateQueue: unknown[][] = [];
    const mockEventEmit = vi.fn();
    return { selectQueue, insertQueue, updateQueue, mockEventEmit };
  });

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(insertQueue.shift() ?? [])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(updateQueue.shift() ?? [])),
        })),
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
}));

vi.mock('../../schema', () => ({
  uiFlows: { id: 'id' },
  uiFlowVersions: {},
}));

import { POST } from '../../api/ui-flows-publish.handler';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('ui-flows-publish.handler', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    vi.clearAllMocks();
  });

  it('publishes a draft flow and bumps version', async () => {
    const flow = { id: 1, tenantId: 1, name: 'Portal', slug: 'portal', definition: {}, themeConfig: null, domainConfig: null, status: 'draft', version: 1 };
    selectQueue.push([flow]);
    insertQueue.push([]); // version snapshot insert
    const published = { ...flow, status: 'published', version: 2 };
    updateQueue.push([published]);

    const req = new NextRequest('http://localhost/api/ui-flows/1/publish', { method: 'POST' });
    const res = await POST(req, makeContext('1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('published');
    expect(body.version).toBe(2);
  });

  it('emits ui-flows.flow.published event', async () => {
    const flow = { id: 1, tenantId: 1, name: 'Portal', slug: 'portal', definition: {}, themeConfig: null, domainConfig: { subdomain: 'test' }, status: 'draft', version: 1 };
    selectQueue.push([flow]);
    insertQueue.push([]);
    updateQueue.push([{ ...flow, status: 'published', version: 2 }]);

    const req = new NextRequest('http://localhost/api/ui-flows/1/publish', { method: 'POST' });
    await POST(req, makeContext('1'));
    expect(mockEventEmit).toHaveBeenCalledWith(
      'ui-flows.flow.published',
      expect.objectContaining({ id: 1, version: 2, domain: 'test' })
    );
  });

  it('returns 404 when flow not found', async () => {
    selectQueue.push([]);

    const req = new NextRequest('http://localhost/api/ui-flows/999/publish', { method: 'POST' });
    const res = await POST(req, makeContext('999'));
    expect(res.status).toBe(404);
  });

  it('returns 400 when flow is already published', async () => {
    const flow = { id: 1, status: 'published', version: 2 };
    selectQueue.push([flow]);

    const req = new NextRequest('http://localhost/api/ui-flows/1/publish', { method: 'POST' });
    const res = await POST(req, makeContext('1'));
    expect(res.status).toBe(400);
  });
});
