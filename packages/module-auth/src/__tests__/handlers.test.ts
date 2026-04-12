import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Shared mock state ──────────────────────────────────────────
const dbResults: unknown[][] = [];
const deletedRows: unknown[][] = [];
const mockInsert = vi.fn();
const mockValues = vi.fn().mockReturnValue(Promise.resolve());
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockDeleteWhere = vi.fn();

vi.mock('@oven/module-registry/db', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => dbResults.shift() ?? [],
        }),
      }),
    }),
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return {
        values: (...vargs: unknown[]) => {
          mockValues(...vargs);
          return Promise.resolve();
        },
      };
    },
    update: () => ({
      set: (...args: unknown[]) => {
        mockUpdateSet(...args);
        return {
          where: (...args: unknown[]) => {
            mockUpdateWhere(...args);
            return Promise.resolve();
          },
        };
      },
    }),
    delete: () => ({
      where: (...args: unknown[]) => {
        mockDeleteWhere(...args);
        return { returning: () => deletedRows.shift() ?? [] };
      },
    }),
  }),
}));

const mockVerifyPassword = vi.fn();
const mockCreateSession = vi.fn();
const mockVerifyToken = vi.fn();

vi.mock('../auth-utils', () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
  createSession: (...args: unknown[]) => mockCreateSession(...args),
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
}));

const mockEmit = vi.fn();
vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: (...args: unknown[]) => mockEmit(...args) },
}));

vi.mock('../schema', () => ({
  users: {},
  authSessions: {},
  apiKeys: {},
}));

// ─── Handler imports ────────────────────────────────────────────
import { POST as loginPOST } from '../api/auth-login.handler';
import { POST as logoutPOST } from '../api/auth-logout.handler';
import { GET as meGET } from '../api/auth-me.handler';
import { POST as refreshPOST } from '../api/auth-refresh.handler';

function makeRequest(
  path: string,
  opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): NextRequest {
  const init: RequestInit = { method: opts.method ?? 'GET' };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers = { 'content-type': 'application/json', ...opts.headers };
  } else if (opts.headers) {
    init.headers = opts.headers;
  }
  return new NextRequest(`http://localhost${path}`, init);
}

describe('auth handler tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbResults.length = 0;
    deletedRows.length = 0;
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when email or password missing', async () => {
      const res = await loginPOST(
        makeRequest('/api/auth/login', { method: 'POST', body: { email: 'x@test.com' } })
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/required/i);
    });

    it('returns 401 for unknown email', async () => {
      // User lookup returns empty
      dbResults.push([]);

      const res = await loginPOST(
        makeRequest('/api/auth/login', {
          method: 'POST',
          body: { email: 'unknown@test.com', password: 'secret' },
        })
      );
      expect(res.status).toBe(401);
    });

    it('returns access token on successful login', async () => {
      // User lookup
      dbResults.push([{
        id: 1,
        email: 'user@test.com',
        name: 'Test User',
        passwordHash: '$argon2id$hash',
        status: 'active',
        avatar: null,
        defaultTenantId: null,
      }]);

      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue({
        accessToken: 'access-tok',
        refreshToken: 'refresh-tok',
        expiresIn: 3600,
      });

      const res = await loginPOST(
        makeRequest('/api/auth/login', {
          method: 'POST',
          body: { email: 'user@test.com', password: 'correct-password' },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accessToken).toBe('access-tok');
      expect(data.refreshToken).toBe('refresh-tok');
      expect(data.expiresIn).toBe(3600);
      expect(data.user.email).toBe('user@test.com');
      expect(mockEmit).toHaveBeenCalledWith('auth.user.login', expect.objectContaining({
        userId: 1,
        email: 'user@test.com',
        method: 'password',
      }));
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 401 without Authorization header', async () => {
      const res = await logoutPOST(
        makeRequest('/api/auth/logout', { method: 'POST' })
      );
      expect(res.status).toBe(401);
    });

    it('deletes session and returns success', async () => {
      deletedRows.push([{ id: 10, userId: 5 }]);

      const res = await logoutPOST(
        makeRequest('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: 'Bearer some-token' },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockEmit).toHaveBeenCalledWith('auth.user.logout', expect.objectContaining({
        userId: 5,
        sessionId: 10,
      }));
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without Bearer token', async () => {
      const res = await meGET(
        makeRequest('/api/auth/me')
      );
      expect(res.status).toBe(401);
    });

    it('returns user profile for valid token', async () => {
      mockVerifyToken.mockResolvedValue({ id: 3, email: 'me@test.com', name: 'Me' });
      // User lookup
      dbResults.push([{
        id: 3,
        email: 'me@test.com',
        name: 'Me',
        avatar: 'https://example.com/avatar.jpg',
        defaultTenantId: 1,
        status: 'active',
        lastLoginAt: new Date('2026-04-12'),
        createdAt: new Date('2026-01-01'),
      }]);

      const res = await meGET(
        makeRequest('/api/auth/me', {
          headers: { Authorization: 'Bearer valid-jwt' },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(3);
      expect(data.email).toBe('me@test.com');
      expect(data.status).toBe('active');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns 400 when refreshToken missing', async () => {
      const res = await refreshPOST(
        makeRequest('/api/auth/refresh', { method: 'POST', body: {} })
      );
      expect(res.status).toBe(400);
    });

    it('returns new tokens for valid refresh token', async () => {
      const futureDate = new Date(Date.now() + 86400_000);
      // Session lookup by refresh token hash
      dbResults.push([{
        id: 99,
        userId: 5,
        refreshExpiresAt: futureDate,
      }]);
      // User lookup
      dbResults.push([{
        id: 5,
        email: 'refresh@test.com',
        name: 'Refresh User',
        avatar: null,
        defaultTenantId: 2,
      }]);

      mockCreateSession.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
      });

      const res = await refreshPOST(
        makeRequest('/api/auth/refresh', {
          method: 'POST',
          body: { refreshToken: 'old-refresh-token' },
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.accessToken).toBe('new-access');
      expect(data.refreshToken).toBe('new-refresh');
      expect(data.expiresIn).toBe(3600);
    });
  });
});
