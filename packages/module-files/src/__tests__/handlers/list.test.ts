import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────
const mockGetTenantIds = vi.fn();
vi.mock('@oven/module-auth/auth-utils', () => ({
  getTenantIdsFromRequest: (...args: unknown[]) => mockGetTenantIds(...args),
}));

const dbRows: unknown[] = [];
const dbCount = { count: 0 };

vi.mock('@oven/module-registry/db', () => ({
  getDb: () => ({
    select: (selectArg?: unknown) => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => ({
              offset: () => dbRows,
            }),
          }),
        }),
      }),
    }),
  }),
}));

// Override to handle both the data query and the count query
const mockPromiseAll = vi.fn();
vi.mock('@oven/module-registry/api-utils', () => ({
  parseListParams: (req: NextRequest) => {
    const url = new URL(req.url);
    return {
      sort: url.searchParams.get('_sort') ?? 'id',
      order: url.searchParams.get('_order') ?? 'asc',
      limit: 25,
      offset: 0,
      filter: Object.fromEntries(url.searchParams.entries()),
    };
  },
  listResponse: (data: unknown[], name: string, params: unknown, total: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ data, total });
  },
  badRequest: (msg: string) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status: 400 });
  },
}));

vi.mock('../../schema', () => ({
  files: {
    tenantId: 'tenant_id',
    filename: 'filename',
    folder: 'folder',
    mimeType: 'mime_type',
    sourceModule: 'source_module',
    id: 'id',
    sizeBytes: 'size_bytes',
    createdAt: 'created_at',
  },
}));

vi.mock('../../api/_utils/sort', () => ({
  getOrderColumn: (_table: unknown, sort: string, allowed: readonly string[]) => {
    if (allowed.includes(sort)) {
      return { ok: true, column: sort };
    }
    return { ok: false, received: sort, allowed };
  },
}));

// Need to mock drizzle functions
vi.mock('drizzle-orm', () => ({
  sql: () => 'count',
  asc: (col: unknown) => col,
  desc: (col: unknown) => col,
  eq: (a: unknown, b: unknown) => ({ type: 'eq', a, b }),
  and: (...args: unknown[]) => ({ type: 'and', args }),
  or: (...args: unknown[]) => ({ type: 'or', args }),
  ilike: (a: unknown, b: unknown) => ({ type: 'ilike', a, b }),
  isNull: (a: unknown) => ({ type: 'isNull', a }),
  inArray: (a: unknown, b: unknown) => ({ type: 'inArray', a, b }),
}));

// We need to handle Promise.all in the handler — intercept the db calls
// by overriding the getDb mock for the list handler specifically

// Re-mock getDb to return something the list handler can use
vi.mock('@oven/module-registry/db', () => {
  let callIndex = 0;
  return {
    getDb: () => ({
      select: (selectArg?: unknown) => {
        const isCountQuery = selectArg != null;
        return {
          from: () => ({
            where: (whereClause?: unknown) => {
              if (isCountQuery) {
                return [{ count: dbCount.count }];
              }
              return {
                orderBy: () => ({
                  limit: () => ({
                    offset: () => [...dbRows],
                  }),
                }),
              };
            },
          }),
        };
      },
    }),
  };
});

import { GET } from '../../api/files.handler';

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/files');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe('GET /api/files (list)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbRows.length = 0;
    dbCount.count = 0;
  });

  it('returns files for a single-tenant caller', async () => {
    mockGetTenantIds.mockResolvedValue([1]);
    dbRows.push(
      { id: 1, tenantId: 1, filename: 'a.pdf' },
      { id: 2, tenantId: null, filename: 'global.pdf' },
    );
    dbCount.count = 2;

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(2);
    expect(mockGetTenantIds).toHaveBeenCalled();
  });

  it('returns 400 on invalid sort field', async () => {
    mockGetTenantIds.mockResolvedValue([1]);
    const res = await GET(makeRequest({ _sort: 'hacked' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid sort field/);
  });

  it('always includes platform-global rows', async () => {
    mockGetTenantIds.mockResolvedValue([99]);
    dbRows.push(
      { id: 10, tenantId: null, filename: 'platform.pdf' },
    );
    dbCount.count = 1;

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data[0].tenantId).toBeNull();
  });

  it('returns empty list for unauthenticated caller', async () => {
    mockGetTenantIds.mockResolvedValue([]);
    dbCount.count = 0;

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });
});
