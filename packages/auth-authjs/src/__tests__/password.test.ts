import { describe, it, expect, vi } from 'vitest';

// Mock external deps not needed for password tests
vi.mock('next-auth/jwt', () => ({
  encode: vi.fn(),
  decode: vi.fn(),
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));
vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(),
}));
vi.mock('@oven/module-auth/schema', () => ({
  apiKeys: {},
}));

import { authJsAdapter } from '../index';

describe('authJsAdapter password hashing (Argon2id)', () => {
  it('hashPassword produces a verifiable Argon2id hash', async () => {
    const password = 'correct-horse-battery-staple';

    const hash = await authJsAdapter.hashPassword!(password);

    // Encoded Argon2id hash starts with $argon2id$
    expect(hash).toMatch(/^\$argon2id\$/);

    // Roundtrip: verifyPassword succeeds for correct password
    const isValid = await authJsAdapter.verifyPassword!(password, hash);
    expect(isValid).toBe(true);

    // Rejects wrong password
    const isWrong = await authJsAdapter.verifyPassword!('wrong-password', hash);
    expect(isWrong).toBe(false);
  });
});
