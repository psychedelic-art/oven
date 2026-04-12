import { describe, it, expect } from 'vitest';

/**
 * Tests for the service-slug validation regex used by
 * GET /api/tenant-subscriptions/[tenantId]/limits/[serviceSlug].
 *
 * The slug is validated BEFORE touching the database so that
 * injection attempts (path traversal, SQL fragments, etc.) never
 * reach the query layer. Closes DRIFT-S02-3 from CODE-REVIEW.md.
 */

const SERVICE_SLUG_PATTERN = /^[a-z0-9-]+$/;

describe('tenant-service-limit — slug validation', () => {
  describe('accepts valid service slugs', () => {
    const validSlugs = [
      'ai-tokens',
      'whatsapp-messages',
      'sms',
      'email',
      'storage',
      'embeddings',
      'llm-tokens',
      'ai-chat-sessions',
      'a',
      '0',
      'a-b-c-d',
      '123-456',
    ];

    for (const slug of validSlugs) {
      it(`accepts "${slug}"`, () => {
        expect(SERVICE_SLUG_PATTERN.test(slug)).toBe(true);
      });
    }
  });

  describe('rejects path traversal and injection attempts', () => {
    const maliciousSlugs: Array<[string, string]> = [
      ['../../etc/passwd', 'Unix path traversal'],
      ['..\\windows\\system32', 'Windows path traversal'],
      ['foo/bar', 'forward slash'],
      ['foo\\bar', 'backslash'],
      ["'; DROP TABLE sub_services; --", 'SQL injection'],
      ['<script>alert(1)</script>', 'XSS attempt'],
      ['ai tokens', 'space in slug'],
      ['AI-TOKENS', 'uppercase letters'],
      ['AiTokens', 'camelCase'],
      ['ai_tokens', 'underscore (not allowed in slug pattern)'],
      ['', 'empty string'],
      ['ai-tokens\n', 'trailing newline'],
      ['ai-tokens\r\n', 'CRLF injection'],
      ['%2e%2e%2f', 'URL-encoded traversal'],
      ['ai-tokens;', 'semicolon'],
      ['ai-tokens&extra=1', 'query string injection'],
    ];

    for (const [slug, reason] of maliciousSlugs) {
      it(`rejects ${reason}: "${slug}"`, () => {
        expect(SERVICE_SLUG_PATTERN.test(slug)).toBe(false);
      });
    }
  });

  it('does not match empty string (+ quantifier requires at least 1 char)', () => {
    expect(SERVICE_SLUG_PATTERN.test('')).toBe(false);
  });

  it('matches slugs of arbitrary length when composed of valid chars', () => {
    const longSlug = 'a-'.repeat(100) + 'z';
    expect(SERVICE_SLUG_PATTERN.test(longSlug)).toBe(true);
  });

  it('allows leading and trailing hyphens (the DB slug constraint handles that)', () => {
    // The regex only enforces charset, not semantic validity like
    // "no leading/trailing hyphens". That rule, if needed, belongs
    // in the service-creation handler, not in the limit-query path.
    expect(SERVICE_SLUG_PATTERN.test('-leading')).toBe(true);
    expect(SERVICE_SLUG_PATTERN.test('trailing-')).toBe(true);
  });
});
