import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Shared mock state ──────────────────────────────────────────
const dbResults: unknown[][] = [];
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

const mockVerifyToken = vi.fn();
const mockVerifyPassword = vi.fn();
const mockHashPassword = vi.fn();

vi.mock('../auth-utils', () => ({
  verifyToken: (...args: unknown[]) => mockVerifyToken(...args),
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}));

const mockEmit = vi.fn();
vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: (...args: unknown[]) => mockEmit(...args) },
}));

vi.mock('../schema', () => ({
  users: {},
}));

import { POST as changePasswordPOST } from '../api/auth-change-password.handler';

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

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbResults.length = 0;
  });

  it('returns 401 without Authorization header', async () => {
    const res = await changePasswordPOST(
      makeRequest('/api/auth/change-password', {
        body: { currentPassword: 'old', newPassword: 'new' },
      })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('AUTH_MISSING_CREDENTIAL');
  });

  it('returns 401 for invalid token', async () => {
    mockVerifyToken.mockResolvedValue(null);

    const res = await changePasswordPOST(
      makeRequest('/api/auth/change-password', {
        body: { currentPassword: 'old', newPassword: 'new' },
        headers: { Authorization: 'Bearer bad-token' },
      })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  it('returns 400 when passwords are missing', async () => {
    mockVerifyToken.mockResolvedValue({ id: 1, email: 'user@test.com', name: 'User' });

    const res = await changePasswordPOST(
      makeRequest('/api/auth/change-password', {
        body: { currentPassword: 'old' },
        headers: { Authorization: 'Bearer valid-token' },
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 401 when current password is wrong', async () => {
    mockVerifyToken.mockResolvedValue({ id: 1, email: 'user@test.com', name: 'User' });
    dbResults.push([{ id: 1, passwordHash: '$argon2id$hash' }]);
    mockVerifyPassword.mockResolvedValue(false);

    const res = await changePasswordPOST(
      makeRequest('/api/auth/change-password', {
        body: { currentPassword: 'wrong', newPassword: 'new-pass' },
        headers: { Authorization: 'Bearer valid-token' },
      })
    );
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe('AUTH_INVALID_CREDENTIAL');
  });

  it('changes password on success and emits event', async () => {
    mockVerifyToken.mockResolvedValue({ id: 1, email: 'user@test.com', name: 'User' });
    dbResults.push([{ id: 1, passwordHash: '$argon2id$old-hash' }]);
    mockVerifyPassword.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue('$argon2id$new-hash');

    const res = await changePasswordPOST(
      makeRequest('/api/auth/change-password', {
        body: { currentPassword: 'correct', newPassword: 'new-password' },
        headers: { Authorization: 'Bearer valid-token' },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockHashPassword).toHaveBeenCalledWith('new-password');
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: '$argon2id$new-hash' })
    );
    expect(mockEmit).toHaveBeenCalledWith('auth.user.passwordChanged', {
      userId: 1,
      method: 'self-service',
    });
  });
});
