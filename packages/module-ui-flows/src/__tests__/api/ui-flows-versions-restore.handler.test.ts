import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { selectQueue, updateQueue, mockEventEmit } =
  vi.hoisted(() => {
    const selectQueue: unknown[][] = [];
    const updateQueue: unknown[][] = [];
    const mockEventEmit = vi.fn();
    return { selectQueue, updateQueue, mockEventEmit };
  });

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(selectQueue.shift() ?? [])),
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
  uiFlows: { id: 'id' },
  uiFlowVersions: { uiFlowId: 'ui_flow_id', id: 'id' },
}));

import { POST } from '../../api/ui-flows-versions-restore.handler';

function makeContext(id: string, versionId: string) {
  return { params: Promise.resolve({ id, versionId }) };
}

describe('ui-flows-versions-restore.handler', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    updateQueue.length = 0;
    vi.clearAllMocks();
  });

  it('restores a version and sets status to draft', async () => {
    const version = { id: 5, uiFlowId: 10, version: 1, definition: { restored: true }, themeConfig: { color: 'blue' } };
    selectQueue.push([version]);
    const restored = { id: 10, tenantId: 1, name: 'Portal', version: 2, status: 'draft' };
    updateQueue.push([restored]);

    const req = new NextRequest('http://localhost/api/ui-flows/10/versions/5/restore', { method: 'POST' });
    const res = await POST(req, makeContext('10', '5'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });

  it('emits ui-flows.flow.updated event after restore', async () => {
    selectQueue.push([{ id: 5, definition: {}, themeConfig: null }]);
    updateQueue.push([{ id: 10, tenantId: 1, name: 'P', version: 2 }]);

    const req = new NextRequest('http://localhost', { method: 'POST' });
    await POST(req, makeContext('10', '5'));
    expect(mockEventEmit).toHaveBeenCalledWith(
      'ui-flows.flow.updated',
      expect.objectContaining({ id: 10 })
    );
  });

  it('returns 404 when version not found', async () => {
    selectQueue.push([]);

    const req = new NextRequest('http://localhost', { method: 'POST' });
    const res = await POST(req, makeContext('10', '999'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when flow not found after version lookup', async () => {
    selectQueue.push([{ id: 5, definition: {}, themeConfig: null }]);
    updateQueue.push([]); // no flow found

    const req = new NextRequest('http://localhost', { method: 'POST' });
    const res = await POST(req, makeContext('999', '5'));
    expect(res.status).toBe(404);
  });
});
