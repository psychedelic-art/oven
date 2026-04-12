import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ──────────────────────────────────────────────────────
const mockVerifyToken = vi.fn();
const mockVerifyApiKey = vi.fn();

vi.mock('../auth-utils', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
  verifyApiKey: (...args: unknown[]) => mockVerifyApiKey(...args),
}));

// Chain mock: each select().from().where().limit() call pops
// the next entry from dbResults.
const dbResults: unknown[][] = [];
const mockDbUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
});

vi.mock('@oven/module-registry/db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => dbResults.shift() ?? [],
        }),
      }),
    }),
    update: (...args: unknown[]) => mockDbUpdate(...args),
  }),
}));

vi.mock('../schema', () => ({
  authSessions: { token: 'token', expiresAt: 'expires_at' },
  apiKeys: { id: 'id', keyPrefix: 'key_prefix', enabled: 'enabled', lastUsedAt: 'last_used_at' },
  users: { id: 'id', email: 'email', name: 'name' },
}));

import { authMiddleware } from '../middleware/auth-middleware';

function makeRequest(
  path: string,
  headers: Record<string, string> = {}
): NextRequest {
  const url = `http://localhost${path}`;
  return new NextRequest(url, { headers });
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbResults.length = 0;
  });

  it('returns null for public endpoints (bypass)', async () => {
    const result = await authMiddleware(
      makeRequest('/api/auth/login')
    );
    expect(result).toBeNull();
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockVerifyApiKey).not.toHaveBeenCalled();
  });

  it('authenticates via X-API-Key header', async () => {
    mockVerifyApiKey.mockResolvedValue({
      id: 1,
      tenantId: 10,
      userId: 5,
      permissions: ['read', 'write'],
    });
    // User lookup for API-key scoped user
    dbResults.push([{ id: 5, email: 'user@test.com', name: 'Test User' }]);

    const result = await authMiddleware(
      makeRequest('/api/some-resource', { 'X-API-Key': 'oven_abc_secret' })
    );

    expect(mockVerifyApiKey).toHaveBeenCalledWith('oven_abc_secret');
    expect(result).not.toBeNull();
    expect(result!.authMethod).toBe('api-key');
    expect(result!.userId).toBe(5);
    expect(result!.permissions).toEqual(['read', 'write']);
  });

  it('authenticates via X-Session-Token header', async () => {
    const futureDate = new Date(Date.now() + 3600_000);
    // First query: session lookup
    dbResults.push([{ id: 1, userId: 7, expiresAt: futureDate }]);
    // Second query: user lookup
    dbResults.push([{ id: 7, email: 'session@test.com', name: 'Session User', defaultTenantId: 3 }]);

    const result = await authMiddleware(
      makeRequest('/api/protected', { 'X-Session-Token': 'valid-session-token' })
    );

    expect(result).not.toBeNull();
    expect(result!.authMethod).toBe('session-token');
    expect(result!.userId).toBe(7);
    expect(result!.email).toBe('session@test.com');
  });

  it('authenticates via Authorization Bearer token', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 42,
      email: 'bearer@test.com',
      name: 'Bearer User',
      defaultTenantId: 5,
    });

    const result = await authMiddleware(
      makeRequest('/api/data', { Authorization: 'Bearer jwt-token-here' })
    );

    expect(mockVerifyToken).toHaveBeenCalledWith('jwt-token-here');
    expect(result).not.toBeNull();
    expect(result!.authMethod).toBe('jwt');
    expect(result!.userId).toBe(42);
    expect(result!.email).toBe('bearer@test.com');
    expect(result!.tenantId).toBe(5);
  });

  it('returns null when no credentials are provided', async () => {
    const result = await authMiddleware(
      makeRequest('/api/protected')
    );
    expect(result).toBeNull();
  });

  it('returns null for expired session token', async () => {
    const pastDate = new Date(Date.now() - 3600_000);
    // Session found but expired
    dbResults.push([{ id: 1, userId: 7, expiresAt: pastDate }]);

    const result = await authMiddleware(
      makeRequest('/api/protected', { 'X-Session-Token': 'expired-token' })
    );

    expect(result).toBeNull();
  });
});
