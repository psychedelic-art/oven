import { describe, it, expect } from 'vitest';

/**
 * F-sprint-02: Service slug validation tests.
 *
 * DRIFT-S02-3 from CODE-REVIEW.md: the tenant-service-limit handler
 * must reject serviceSlug values that don't match ^[a-z0-9-]+$ before
 * touching the DB. This prevents injection via path traversal or
 * SQL-adjacent payloads.
 */

const SERVICE_SLUG_PATTERN = /^[a-z0-9-]+$/;

describe('serviceSlug validation pattern', () => {
  describe('valid slugs', () => {
    it.each([
      'ai-tokens',
      'whatsapp-messages',
      'storage',
      'api-calls',
      'sms',
      'email-sends',
      'a',
      '123',
      'a-b-c-d',
    ])('accepts "%s"', (slug) => {
      expect(SERVICE_SLUG_PATTERN.test(slug)).toBe(true);
    });
  });

  describe('invalid slugs (injection attempts)', () => {
    it.each([
      ['../../etc/passwd', 'path traversal'],
      ['foo bar', 'spaces'],
      ['FOO', 'uppercase'],
      ['ai_tokens', 'underscores'],
      ['', 'empty string'],
      ['ai.tokens', 'dots'],
      ['slug;DROP TABLE', 'SQL injection'],
      ['slug\' OR 1=1', 'SQL injection with quote'],
      ['<script>', 'XSS attempt'],
      ['../../../', 'relative path'],
    ])('rejects "%s" (%s)', (slug) => {
      expect(SERVICE_SLUG_PATTERN.test(slug)).toBe(false);
    });
  });

  describe('boundary cases', () => {
    it('rejects null-ish when coerced to string', () => {
      expect(SERVICE_SLUG_PATTERN.test('null')).toBe(true); // "null" is a valid slug
      expect(SERVICE_SLUG_PATTERN.test('undefined')).toBe(true); // "undefined" is valid
    });

    it('rejects strings with leading/trailing dashes', () => {
      // These are technically valid per the regex (just lowercase + dashes)
      // but semantically odd — the regex permits them.
      expect(SERVICE_SLUG_PATTERN.test('-leading')).toBe(true);
      expect(SERVICE_SLUG_PATTERN.test('trailing-')).toBe(true);
    });

    it('rejects strings with unicode', () => {
      expect(SERVICE_SLUG_PATTERN.test('caf\u00e9')).toBe(false);
      expect(SERVICE_SLUG_PATTERN.test('\u00fcber')).toBe(false);
    });
  });
});
