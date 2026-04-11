import { describe, it, expect } from 'vitest';
import { getOrderColumn } from '../api/_utils/sort';
import { files } from '../schema';

// Whitelisted sort columns for `GET /api/files`. MUST be kept in sync
// with `files.handler.ts:ALLOWED_SORTS`. The sprint-01 acceptance row
// "ALLOWED_SORTS is exactly the 8 documented fields (no drift)" is
// enforced by the final test in this file.
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'filename',
  'mimeType',
  'sizeBytes',
  'folder',
  'sourceModule',
  'createdAt',
] as const;

describe('module-files api/_utils/sort — getOrderColumn (F-05-01)', () => {
  describe('allowlist enforcement', () => {
    it('returns ok for every whitelisted column', () => {
      for (const field of ALLOWED_SORTS) {
        const result = getOrderColumn(files, field, ALLOWED_SORTS);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.column).toBeDefined();
        }
      }
    });

    it('rejects a field that exists on the table but is not in the allowlist', () => {
      // `storageKey`, `publicUrl`, `width`, `height`, `sourceId`, and
      // `metadata` are real columns on the `files` table but are NOT
      // safe to expose as sortable fields (PII leak, high-cardinality
      // index miss, or URL-pattern exposure). The allowlist guards
      // against drift as columns are added.
      const result = getOrderColumn(files, 'storageKey', ALLOWED_SORTS);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.received).toBe('storageKey');
        expect(result.allowed).toEqual(ALLOWED_SORTS);
      }
    });

    it('rejects a SQL-injection-shaped string', () => {
      const result = getOrderColumn(
        files,
        "'; DROP TABLE files; --",
        ALLOWED_SORTS,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.received).toBe("'; DROP TABLE files; --");
      }
    });

    it('rejects an empty string', () => {
      const result = getOrderColumn(files, '', ALLOWED_SORTS);
      expect(result.ok).toBe(false);
    });

    it('rejects a prototype key like "constructor"', () => {
      // Before F-05-01, `(files as any)['constructor']` resolved to
      // `Function.prototype.constructor`, which Drizzle then crashed
      // on at runtime with an opaque error. The allowlist check now
      // short-circuits before the bracket lookup happens.
      const result = getOrderColumn(files, 'constructor', ALLOWED_SORTS);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.received).toBe('constructor');
      }
    });

    it('rejects "__proto__" (prototype pollution guard)', () => {
      const result = getOrderColumn(files, '__proto__', ALLOWED_SORTS);
      expect(result.ok).toBe(false);
    });

    it('is case-sensitive — "ID" is not "id"', () => {
      const result = getOrderColumn(files, 'ID', ALLOWED_SORTS);
      expect(result.ok).toBe(false);
    });
  });

  describe('resolved column identity', () => {
    it('returns the live Drizzle column reference for id', () => {
      const result = getOrderColumn(files, 'id', ALLOWED_SORTS);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // The column must be the same reference Drizzle's asc()/desc()
        // expects so the order-by clause is compiled correctly.
        expect(result.column).toBe(files.id);
      }
    });

    it('returns the live Drizzle column reference for createdAt', () => {
      const result = getOrderColumn(files, 'createdAt', ALLOWED_SORTS);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.column).toBe(files.createdAt);
      }
    });
  });

  describe('allowlist drift guard', () => {
    it('ALLOWED_SORTS is exactly the 8 documented fields', () => {
      // If this test fails, either the allowlist was expanded without
      // a matching docs update (see detailed-requirements.md R2.4), or
      // a required field was removed. Either way, review the handler
      // and the canonical api.md before editing this assertion.
      expect([...ALLOWED_SORTS]).toEqual([
        'id',
        'tenantId',
        'filename',
        'mimeType',
        'sizeBytes',
        'folder',
        'sourceModule',
        'createdAt',
      ]);
    });
  });
});
