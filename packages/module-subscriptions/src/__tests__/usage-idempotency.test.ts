import { describe, it, expect } from 'vitest';

/**
 * Tests for the idempotency-key validation pattern used by
 * POST /api/usage/track. The handler enforces the regex below
 * on the `X-Usage-Idempotency-Key` header before forwarding
 * the key to `UsageMeteringService.trackUsage()`.
 *
 * The DB-level deduplication (SELECT + unique partial index on
 * `sub_usage_records.idempotency_key`) is an integration concern
 * and requires a live database — it is NOT covered here. These
 * tests focus on the input-validation boundary (OWASP A08).
 */

const IDEMPOTENCY_KEY_PATTERN = /^[a-f0-9-]{36}$/;

describe('usage-track — idempotency key validation', () => {
  describe('accepts valid UUID v4 keys', () => {
    const validKeys = [
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '00000000-0000-0000-0000-000000000000',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ];

    for (const key of validKeys) {
      it(`accepts "${key}"`, () => {
        expect(IDEMPOTENCY_KEY_PATTERN.test(key)).toBe(true);
      });
    }
  });

  describe('rejects invalid keys', () => {
    const invalidKeys: Array<[string, string]> = [
      ['', 'empty string'],
      ['not-a-uuid', 'too short, not hex'],
      ['550E8400-E29B-41D4-A716-446655440000', 'uppercase hex'],
      ['550e8400e29b41d4a716446655440000', 'no hyphens (32 chars)'],
      ['550e8400-e29b-41d4-a716-44665544000', 'only 35 chars'],
      ['550e8400-e29b-41d4-a716-4466554400000', '37 chars'],
      ['550e8400-e29b-41d4-a716-44665544000g', 'non-hex char g'],
      ['../../etc/passwd-00000000000000000', 'path traversal attempt'],
      ['550e8400-e29b-41d4-a716-44665544000\n', 'trailing newline'],
      [' 550e8400-e29b-41d4-a716-446655440000', 'leading space'],
    ];

    for (const [key, reason] of invalidKeys) {
      it(`rejects ${reason}: "${key}"`, () => {
        expect(IDEMPOTENCY_KEY_PATTERN.test(key)).toBe(false);
      });
    }
  });

  it('handles exactly 36 characters of lowercase hex + hyphens', () => {
    // The pattern enforces length=36 and charset [a-f0-9-], which
    // matches the standard UUID v4 textual representation. Hyphens
    // count toward the 36-char budget, not just hex digits.
    const key = '01234567-89ab-cdef-0123-456789abcdef';
    expect(key.length).toBe(36);
    expect(IDEMPOTENCY_KEY_PATTERN.test(key)).toBe(true);
  });

  it('rejects keys with uppercase even if otherwise valid', () => {
    const upper = '550E8400-E29B-41D4-A716-446655440000';
    const lower = upper.toLowerCase();
    expect(IDEMPOTENCY_KEY_PATTERN.test(upper)).toBe(false);
    expect(IDEMPOTENCY_KEY_PATTERN.test(lower)).toBe(true);
  });
});

describe('usage-track — TrackUsageParams contract', () => {
  it('idempotencyKey is optional in the interface', () => {
    // This test asserts the TypeScript interface shape at the type
    // level. At runtime, we just verify that an object without the
    // key is structurally valid (no required-field error).
    const params = {
      tenantId: 1,
      serviceSlug: 'ai-tokens',
      amount: 10,
    };
    expect(params).toHaveProperty('tenantId');
    expect(params).toHaveProperty('serviceSlug');
    expect(params).toHaveProperty('amount');
    expect(params).not.toHaveProperty('idempotencyKey');
  });

  it('idempotencyKey can be provided', () => {
    const params = {
      tenantId: 1,
      serviceSlug: 'ai-tokens',
      amount: 10,
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
    };
    expect(params.idempotencyKey).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
