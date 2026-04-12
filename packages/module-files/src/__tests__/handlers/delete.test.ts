import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────
const mockGetTenantIds = vi.fn();
vi.mock('@oven/module-auth/auth-utils', () => ({
  getTenantIdsFromRequest: (...args: unknown[]) => mockGetTenantIds(...args),
}));

const dbSelectResults: unknown[][] = [];
const dbDeleteResults: unknown[][] = [];
const mockStorageDelete = vi.fn();

vi.mock('@oven/module-registry/db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => dbSelectResults.shift() ?? [],
      }),
    }),
    delete: () => ({
      where: () => ({
        returning: () => dbDeleteResults.shift() ?? [],
      }),
    }),
  }),
}));

vi.mock('@oven/module-registry/api-utils', () => ({
  notFound: (msg: string) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status: 404 });
  },
}));

const mockEmit = vi.fn();
vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: (...args: unknown[]) => mockEmit(...args) },
}));

vi.mock('../../schema', () => ({
  files: { id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

vi.mock('../../engine/storage-adapter', () => ({
  getStorageAdapter: () =>
    Promise.resolve({
      delete: (...args: unknown[]) => mockStorageDelete(...args),
    }),
}));

import { DELETE } from '../../api/files-by-id.handler';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/files/1', { method: 'DELETE' });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('DELETE /api/files/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectResults.length = 0;
    dbDeleteResults.length = 0;
    mockStorageDelete.mockResolvedValue(undefined);
  });

  it('deletes file for same-tenant caller', async () => {
    const record = {
      id: 1,
      tenantId: 5,
      filename: 'report.pdf',
      publicUrl: 'https://blob.example.com/report.pdf',
      storageKey: 'files/report.pdf',
      folder: 'reports',
      sourceModule: null,
      sourceId: null,
    };
    dbSelectResults.push([record]);
    dbDeleteResults.push([record]);
    mockGetTenantIds.mockResolvedValue([5]);

    const res = await DELETE(makeRequest(), makeContext('1'));
    expect(res.status).toBe(200);
    expect(mockStorageDelete).toHaveBeenCalledWith(record.publicUrl);
    expect(mockEmit).toHaveBeenCalledWith('files.file.deleted', expect.objectContaining({
      id: 1,
      tenantId: 5,
    }));
  });

  it('returns 404 for cross-tenant caller without calling adapter.delete', async () => {
    dbSelectResults.push([{
      id: 1,
      tenantId: 5,
      filename: 'secret.pdf',
      publicUrl: 'https://blob.example.com/secret.pdf',
    }]);
    mockGetTenantIds.mockResolvedValue([99]);

    const res = await DELETE(makeRequest(), makeContext('1'));
    expect(res.status).toBe(404);
    expect(mockStorageDelete).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('returns 404 for missing file', async () => {
    dbSelectResults.push([]);

    const res = await DELETE(makeRequest(), makeContext('999'));
    expect(res.status).toBe(404);
    expect(mockStorageDelete).not.toHaveBeenCalled();
  });

  it('logs and continues on adapter failure', async () => {
    const record = {
      id: 3,
      tenantId: null,
      filename: 'orphan.pdf',
      publicUrl: 'https://blob.example.com/orphan.pdf',
      storageKey: 'files/orphan.pdf',
      folder: null,
      sourceModule: null,
      sourceId: null,
    };
    dbSelectResults.push([record]);
    dbDeleteResults.push([record]);
    mockStorageDelete.mockRejectedValue(new Error('Storage unavailable'));

    const res = await DELETE(makeRequest(), makeContext('3'));
    // Should succeed despite adapter failure
    expect(res.status).toBe(200);
    expect(mockEmit).toHaveBeenCalledWith('files.file.deleted', expect.objectContaining({
      id: 3,
    }));
  });
});
