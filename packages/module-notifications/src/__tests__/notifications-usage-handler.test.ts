import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn() },
}));

import { GET } from '../api/notifications-usage.handler';

function makeRequest(url: string) {
  return {
    nextUrl: new URL(url, 'http://localhost'),
  } as unknown as import('next/server').NextRequest;
}

describe('GET /notifications/usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when tenantId is missing', async () => {
    const req = makeRequest('http://localhost/api/notifications/usage');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when tenantId is not a positive integer', async () => {
    const req = makeRequest('http://localhost/api/notifications/usage?tenantId=abc');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when tenantId is zero', async () => {
    const req = makeRequest('http://localhost/api/notifications/usage?tenantId=0');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid channelType', async () => {
    const req = makeRequest('http://localhost/api/notifications/usage?tenantId=1&channelType=telegram');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns usage summary for a tenant', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    vi.mocked(getDb).mockReturnValue(
      createMockUsageDb([
        {
          channelType: 'whatsapp',
          messageCount: 150,
          limit: 300,
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
        },
        {
          channelType: 'sms',
          messageCount: 20,
          limit: 200,
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
        },
      ]),
    );

    const req = makeRequest('http://localhost/api/notifications/usage?tenantId=42');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tenantId).toBe(42);
    expect(body.usage).toHaveLength(2);
    expect(body.usage[0]).toEqual(
      expect.objectContaining({
        channelType: 'whatsapp',
        used: 150,
        limit: 300,
        remaining: 150,
        allowed: true,
      }),
    );
    expect(body.usage[1]).toEqual(
      expect.objectContaining({
        channelType: 'sms',
        used: 20,
        limit: 200,
        remaining: 180,
        allowed: true,
      }),
    );
  });

  it('returns empty array when no usage exists', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    vi.mocked(getDb).mockReturnValue(createMockUsageDb([]));

    const req = makeRequest('http://localhost/api/notifications/usage?tenantId=99');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usage).toEqual([]);
  });

  it('filters by channelType when provided', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    vi.mocked(getDb).mockReturnValue(
      createMockUsageDb([
        {
          channelType: 'email',
          messageCount: 500,
          limit: 1000,
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
        },
      ]),
    );

    const req = makeRequest('http://localhost/api/notifications/usage?tenantId=1&channelType=email');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usage).toHaveLength(1);
    expect(body.usage[0].channelType).toBe('email');
  });

  it('marks allowed=false when at or over limit', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    vi.mocked(getDb).mockReturnValue(
      createMockUsageDb([
        {
          channelType: 'whatsapp',
          messageCount: 300,
          limit: 300,
          periodStart: '2026-04-01',
          periodEnd: '2026-04-30',
        },
      ]),
    );

    const req = makeRequest('http://localhost/api/notifications/usage?tenantId=1');
    const res = await GET(req);
    const body = await res.json();

    expect(body.usage[0].allowed).toBe(false);
    expect(body.usage[0].remaining).toBe(0);
  });
});

// ─── Mock DB helper ─────────────────────────────────────────

function createMockUsageDb(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    then: (resolve: (v: unknown[]) => void) => resolve(rows),
  };
  return chain;
}
