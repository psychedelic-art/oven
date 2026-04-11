import { describe, it, expect } from 'vitest';
import { getOrderColumn } from '../api/_utils/sort';
import { aiPlaygroundExecutions } from '../schema';

// Whitelisted sort columns for the playground executions list handler —
// kept in sync with `ai-playground-executions.handler.ts:ALLOWED_SORTS`.
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'type',
  'model',
  'status',
  'latencyMs',
  'costCents',
  'createdAt',
] as const;

describe('api/_utils/sort — getOrderColumn', () => {
  describe('allowlist enforcement (F-05-01)', () => {
    it('returns ok for every whitelisted column', () => {
      for (const field of ALLOWED_SORTS) {
        const result = getOrderColumn(aiPlaygroundExecutions, field, ALLOWED_SORTS);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.column).toBeDefined();
        }
      }
    });

    it('rejects a field that is not in the allowlist', () => {
      const result = getOrderColumn(aiPlaygroundExecutions, 'error', ALLOWED_SORTS);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.received).toBe('error');
        expect(result.allowed).toEqual(ALLOWED_SORTS);
      }
    });

    it('rejects a completely unknown field', () => {
      const result = getOrderColumn(
        aiPlaygroundExecutions,
        'DROP TABLE users;--',
        ALLOWED_SORTS,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.received).toBe('DROP TABLE users;--');
      }
    });

    it('rejects an empty string', () => {
      const result = getOrderColumn(aiPlaygroundExecutions, '', ALLOWED_SORTS);
      expect(result.ok).toBe(false);
    });

    it('rejects a field whose name matches a prototype key', () => {
      // Guards against passing "constructor", "toString", etc. through
      // the `(table as any)[field]` bypass that F-05-01 replaced.
      const result = getOrderColumn(
        aiPlaygroundExecutions,
        'constructor',
        ALLOWED_SORTS,
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.received).toBe('constructor');
      }
    });

    it('is case-sensitive — "ID" is not "id"', () => {
      const result = getOrderColumn(aiPlaygroundExecutions, 'ID', ALLOWED_SORTS);
      expect(result.ok).toBe(false);
    });
  });

  describe('resolved column shape', () => {
    it('returns the actual Drizzle column object for id', () => {
      const result = getOrderColumn(aiPlaygroundExecutions, 'id', ALLOWED_SORTS);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // The column object must equal the schema's live reference so
        // Drizzle's asc()/desc() helpers accept it.
        expect(result.column).toBe(aiPlaygroundExecutions.id);
      }
    });

    it('returns the actual Drizzle column object for createdAt', () => {
      const result = getOrderColumn(aiPlaygroundExecutions, 'createdAt', ALLOWED_SORTS);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.column).toBe(aiPlaygroundExecutions.createdAt);
      }
    });
  });
});
