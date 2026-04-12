import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { selectQueue, insertQueue, updateQueue, deleteQueue, mockEventEmit } =
  vi.hoisted(() => {
    const selectQueue: unknown[][] = [];
    const insertQueue: unknown[][] = [];
    const updateQueue: unknown[][] = [];
    const deleteQueue: unknown[][] = [];
    const mockEventEmit = vi.fn();
    return { selectQueue, insertQueue, updateQueue, deleteQueue, mockEventEmit };
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
    delete: vi.fn(() => ({
      where: vi.fn(() => {
        const result = deleteQueue.shift() ?? [];
        return {
          returning: vi.fn(() => Promise.resolve(result)),
          then: (resolve: (v: unknown) => void) => resolve(undefined),
        };
      }),
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
  };
});

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: mockEventEmit },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

vi.mock('../../schema', () => ({
  uiFlows: { id: 'id', tenantId: 'tenant_id' },
  uiFlowPages: { uiFlowId: 'ui_flow_id' },
}));

vi.mock('../../slug-utils', () => ({
  normalizeFlowSlug: vi.fn((s: string) => s),
  normalizePageSlug: vi.fn((s: string) => s),
}));

import { GET, PUT, DELETE } from '../../api/ui-flows-by-id.handler';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('ui-flows-by-id.handler', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    insertQueue.length = 0;
    updateQueue.length = 0;
    deleteQueue.length = 0;
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('returns a flow by ID', async () => {
      const flow = { id: 1, tenantId: 1, name: 'Test Flow' };
      selectQueue.push([flow]);

      const req = new NextRequest('http://localhost/api/ui-flows/1');
      const res = await GET(req, makeContext('1'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Test Flow');
    });

    it('returns 404 when flow not found', async () => {
      selectQueue.push([]);

      const req = new NextRequest('http://localhost/api/ui-flows/999');
      const res = await GET(req, makeContext('999'));
      expect(res.status).toBe(404);
    });
  });

  describe('PUT', () => {
    it('updates a flow and emits event', async () => {
      const updated = { id: 1, tenantId: 1, name: 'Updated', version: 1 };
      updateQueue.push([updated]);

      const req = new NextRequest('http://localhost/api/ui-flows/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
        headers: { 'content-type': 'application/json' },
      });
      const res = await PUT(req, makeContext('1'));
      expect(res.status).toBe(200);
      expect(mockEventEmit).toHaveBeenCalledWith(
        'ui-flows.flow.updated',
        expect.objectContaining({ id: 1 })
      );
    });

    it('returns 404 when flow not found for update', async () => {
      updateQueue.push([]);

      const req = new NextRequest('http://localhost/api/ui-flows/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'X' }),
        headers: { 'content-type': 'application/json' },
      });
      const res = await PUT(req, makeContext('999'));
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE', () => {
    it('deletes a flow and returns the deleted row', async () => {
      // First delete = pages (no returning needed, just resolves)
      // Second delete = flow (with returning)
      const deleted = { id: 1, tenantId: 1, name: 'Deleted Flow' };
      deleteQueue.push(undefined as any); // pages delete (void, .where() resolves)
      deleteQueue.push([deleted]); // flow delete returning

      const req = new NextRequest('http://localhost/api/ui-flows/1', { method: 'DELETE' });
      const res = await DELETE(req, makeContext('1'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('Deleted Flow');
    });

    it('returns 404 when flow not found for delete', async () => {
      deleteQueue.push(undefined as any); // pages
      deleteQueue.push([]); // flow not found

      const req = new NextRequest('http://localhost/api/ui-flows/999', { method: 'DELETE' });
      const res = await DELETE(req, makeContext('999'));
      expect(res.status).toBe(404);
    });
  });
});
