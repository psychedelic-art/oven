import { describe, it, expect } from 'vitest';
import { getOrderColumn } from '../api/_utils/sort';
import { tenants, tenantMembers } from '../schema';

// DRIFT-5: regression tests for the sort-field allowlist on
// `packages/module-tenants/src/api/tenants.handler.ts` and
// `tenant-members.handler.ts`. The helper is a verbatim copy of
// `packages/module-ai/src/api/_utils/sort.ts` (F-05-01 pattern),
// re-tested here so a future drift in either copy is caught by the
// owning module's suite.

const TENANTS_ALLOWED = [
  'id',
  'name',
  'slug',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

const MEMBERS_ALLOWED = [
  'id',
  'tenantId',
  'userId',
  'role',
  'createdAt',
  'updatedAt',
] as const;

describe('getOrderColumn — tenants allowlist', () => {
  it.each(TENANTS_ALLOWED)('accepts allowed field %s', (field) => {
    const result = getOrderColumn(tenants, field, TENANTS_ALLOWED);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.column).toBeDefined();
  });

  it('rejects an unknown field with the full allowlist', () => {
    const result = getOrderColumn(tenants, 'password', TENANTS_ALLOWED);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.received).toBe('password');
      expect(result.allowed).toEqual([...TENANTS_ALLOWED]);
    }
  });

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
    'rejects prototype-key bypass %s',
    (field) => {
      const result = getOrderColumn(tenants, field, TENANTS_ALLOWED);
      expect(result.ok).toBe(false);
    },
  );

  it('rejects a metadata-like field that is on the table but not in the allowlist', () => {
    // `metadata` exists on the tenants table but is intentionally NOT
    // allowlisted because sorting by a jsonb column is nonsensical.
    const result = getOrderColumn(tenants, 'metadata', TENANTS_ALLOWED);
    expect(result.ok).toBe(false);
  });

  it('rejects an empty string field', () => {
    const result = getOrderColumn(tenants, '', TENANTS_ALLOWED);
    expect(result.ok).toBe(false);
  });
});

describe('getOrderColumn — tenant-members allowlist', () => {
  it.each(MEMBERS_ALLOWED)('accepts allowed field %s', (field) => {
    const result = getOrderColumn(tenantMembers, field, MEMBERS_ALLOWED);
    expect(result.ok).toBe(true);
  });

  it('rejects `password` with the tenant-members allowlist', () => {
    const result = getOrderColumn(tenantMembers, 'password', MEMBERS_ALLOWED);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.allowed).toEqual([...MEMBERS_ALLOWED]);
  });

  it('rejects `tenants` cross-table column names that happen to exist on a sibling', () => {
    // `name` exists on `tenants` but not on `tenant_members`. The
    // allowlist must keep the two tables independent so a client
    // cannot smuggle a cross-table sort.
    const result = getOrderColumn(tenantMembers, 'name', MEMBERS_ALLOWED);
    expect(result.ok).toBe(false);
  });

  it('rejects prototype-key bypass on tenant-members', () => {
    const result = getOrderColumn(tenantMembers, 'constructor', MEMBERS_ALLOWED);
    expect(result.ok).toBe(false);
  });
});

describe('getOrderColumn — defence-in-depth', () => {
  it('rejects an allowlist entry that does not actually exist on the table', () => {
    // Simulates a copy-paste bug: a future edit adds `slug` to the
    // tenant-members allowlist even though the column does not exist.
    // The helper must reject at runtime instead of producing a 500.
    const bogus = [...MEMBERS_ALLOWED, 'slug'] as unknown as readonly (keyof typeof tenantMembers)[];
    const result = getOrderColumn(tenantMembers, 'slug', bogus);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.received).toBe('slug');
  });
});
