import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  clearAllRateLimits,
} from '@oven/module-registry/rate-limit';

describe('rate-limit primitive', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it('allows requests within the limit', () => {
    const config = { maxRequests: 3, windowSeconds: 60 };
    const r1 = checkRateLimit('test-key', config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit('test-key', config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit('test-key', config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests over the limit', () => {
    const config = { maxRequests: 2, windowSeconds: 60 };
    checkRateLimit('over-key', config);
    checkRateLimit('over-key', config);

    const r3 = checkRateLimit('over-key', config);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it('uses separate keys for separate callers', () => {
    const config = { maxRequests: 1, windowSeconds: 60 };
    const r1 = checkRateLimit('key-a', config);
    expect(r1.allowed).toBe(true);

    const r2 = checkRateLimit('key-b', config);
    expect(r2.allowed).toBe(true);

    // key-a is now exhausted
    const r3 = checkRateLimit('key-a', config);
    expect(r3.allowed).toBe(false);
  });

  it('returns a future resetAt timestamp', () => {
    const before = Date.now();
    const config = { maxRequests: 5, windowSeconds: 120 };
    const result = checkRateLimit('ts-key', config);
    expect(result.resetAt).toBeGreaterThanOrEqual(before + 120_000);
  });

  it('enforces the secure.md login rate limit (5/60s)', () => {
    const config = { maxRequests: 5, windowSeconds: 60 };
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('login:1.2.3.4:user@test.com', config).allowed).toBe(true);
    }
    expect(checkRateLimit('login:1.2.3.4:user@test.com', config).allowed).toBe(false);
  });

  it('enforces the secure.md forgot-password rate limit (3/600s)', () => {
    const config = { maxRequests: 3, windowSeconds: 600 };
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('forgot:user@test.com', config).allowed).toBe(true);
    }
    expect(checkRateLimit('forgot:user@test.com', config).allowed).toBe(false);
  });

  it('enforces the secure.md register rate limit (5/600s)', () => {
    const config = { maxRequests: 5, windowSeconds: 600 };
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('register:1.2.3.4', config).allowed).toBe(true);
    }
    expect(checkRateLimit('register:1.2.3.4', config).allowed).toBe(false);
  });

  it('enforces the secure.md refresh rate limit (60/60s)', () => {
    const config = { maxRequests: 60, windowSeconds: 60 };
    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit('refresh:42', config).allowed).toBe(true);
    }
    expect(checkRateLimit('refresh:42', config).allowed).toBe(false);
  });
});
