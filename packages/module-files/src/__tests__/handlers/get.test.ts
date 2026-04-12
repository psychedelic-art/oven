import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────
const mockGetTenantIds = vi.fn();
vi.mock('@oven/module-auth/auth-utils', () => ({
  getTenantIdsFromRequest: (...args: unknown[]) => mockGetTenantIds(...args),
}));

const dbSelectResults: unknown[][] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => dbSelectResults.shift() ?? [],
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

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn() },
}));

vi.mock('../../schema', () => ({
  files: { id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

vi.mock('../../engine/storage-adapter', () => ({
  getStorageAdapter: vi.fn(),
}));

import { GET } from '../../api/files-by-id.handler';

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/files/1', { headers });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/files/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectResults.length = 0;
  });

  it('returns file for same-tenant caller', async () => {
    dbSelectResults.push([{
      id: 1,
      tenantId: 5,
      filename: 'report.pdf',
      mimeType: 'application/pdf',
    }]);
    mockGetTenantIds.mockResolvedValue([5]);

    const res = await GET(makeRequest(), makeContext('1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(1);
    expect(data.filename).toBe('report.pdf');
  });

  it('returns 404 for cross-tenant caller (NOT 403)', async () => {
    dbSelectResults.push([{
      id: 1,
      tenantId: 5,
      filename: 'secret.pdf',
    }]);
    mockGetTenantIds.mockResolvedValue([99]);

    const res = await GET(makeRequest(), makeContext('1'));
    expect(res.status).toBe(404);
  });

  it('returns 404 for missing id', async () => {
    dbSelectResults.push([]);

    const res = await GET(makeRequest(), makeContext('999'));
    expect(res.status).toBe(404);
  });

  it('returns platform-global file (null tenantId) to any caller', async () => {
    dbSelectResults.push([{
      id: 2,
      tenantId: null,
      filename: 'global.png',
    }]);

    const res = await GET(makeRequest(), makeContext('2'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.tenantId).toBeNull();
    // getTenantIdsFromRequest should NOT be called for null-tenant files
    expect(mockGetTenantIds).not.toHaveBeenCalled();
  });
});
