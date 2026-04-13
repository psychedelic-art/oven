import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { clearAllRateLimits } from '@oven/module-registry/rate-limit';

// ─── Shared mock state ──────────────────────────────────────────
const dbResults: unknown[][] = [];
const mockInsert = vi.fn();
const mockValues = vi.fn().mockReturnValue(Promise.resolve());
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);

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
          return {
            returning: () => dbResults.shift() ?? [],
          };
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
  }),
}));

vi.mock('../auth-utils', () => ({
  verifyPassword: vi.fn(),
  createSession: vi.fn(),
  hashPassword: vi.fn(),
}));

const mockEmit = vi.fn();
vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: (...args: unknown[]) => mockEmit(...args) },
}));

vi.mock('../schema', () => ({
  users: {},
  authSessions: {},
  passwordResetTokens: {},
}));

import { POST as loginPOST } from '../api/auth-login.handler';
import { POST as forgotPOST } from '../api/auth-forgot-password.handler';
import { POST as registerPOST } from '../api/auth-register.handler';

function makeRequest(
  path: string,
  opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): NextRequest {
  const init: RequestInit = { method: opts.method ?? 'POST' };
  if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    init.headers = { 'content-type': 'application/json', ...opts.headers };
  } else if (opts.headers) {
    init.headers = opts.headers;
  }
  return new NextRequest(`http://localhost${path}`, init);
}

describe('handler rate limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbResults.length = 0;
    clearAllRateLimits();
  });

  describe('POST /api/auth/login — 5 req / 60s', () => {
    it('returns 429 after 5 failed attempts', async () => {
      // Each attempt finds no user (returns 401) but consumes rate limit
      for (let i = 0; i < 5; i++) {
        dbResults.push([]);
        const res = await loginPOST(
          makeRequest('/api/auth/login', {
            body: { email: 'brute@test.com', password: 'guess' },
            headers: { 'x-forwarded-for': '10.0.0.1' },
          })
        );
        expect(res.status).toBe(401);
      }

      // 6th attempt should be rate limited
      const res = await loginPOST(
        makeRequest('/api/auth/login', {
          body: { email: 'brute@test.com', password: 'guess' },
          headers: { 'x-forwarded-for': '10.0.0.1' },
        })
      );
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error.code).toBe('AUTH_RATE_LIMITED');
    });
  });

  describe('POST /api/auth/forgot-password — 3 req / 600s', () => {
    it('returns 429 after 3 requests', async () => {
      for (let i = 0; i < 3; i++) {
        const res = await forgotPOST(
          makeRequest('/api/auth/forgot-password', {
            body: { email: 'flood@test.com' },
          })
        );
        expect(res.status).toBe(200);
      }

      const res = await forgotPOST(
        makeRequest('/api/auth/forgot-password', {
          body: { email: 'flood@test.com' },
        })
      );
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error.code).toBe('AUTH_RATE_LIMITED');
    });
  });

  describe('POST /api/auth/register — 5 req / 600s', () => {
    it('returns 429 after 5 registration attempts from same IP', async () => {
      for (let i = 0; i < 5; i++) {
        // Existing user check returns empty, then insert returns new row
        dbResults.push([]);
        dbResults.push([{ id: i + 1, email: `user${i}@test.com`, name: `User ${i}`, status: 'active', createdAt: new Date() }]);
        const res = await registerPOST(
          makeRequest('/api/auth/register', {
            body: { email: `user${i}@test.com`, name: `User ${i}`, password: 'password123' },
            headers: { 'x-forwarded-for': '10.0.0.2' },
          })
        );
        // May be 201 or 409 depending on mock — we just want to consume rate
        expect([201, 409]).toContain(res.status);
      }

      // 6th attempt from same IP should be rate limited
      const res = await registerPOST(
        makeRequest('/api/auth/register', {
          body: { email: 'extra@test.com', name: 'Extra', password: 'password123' },
          headers: { 'x-forwarded-for': '10.0.0.2' },
        })
      );
      expect(res.status).toBe(429);
    });
  });
});
