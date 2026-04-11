import { describe, it, expect } from 'vitest';
import {
  checkLastOwnerRemoval,
  checkMemberLimit,
} from '../api/_utils/member-guards';

// DRIFT-3 + DRIFT-4 regression tests. The helpers are pure and take
// the DB counts as inputs so the handlers can be tested here without
// a drizzle mock — the handler owns the SELECTs, the helper owns the
// branching.

describe('checkLastOwnerRemoval', () => {
  it('allows removing a non-owner regardless of owner count', () => {
    expect(checkLastOwnerRemoval('admin', 1)).toEqual({ ok: true });
    expect(checkLastOwnerRemoval('admin', 0)).toEqual({ ok: true });
    expect(checkLastOwnerRemoval('member', 1)).toEqual({ ok: true });
    expect(checkLastOwnerRemoval('member', 5)).toEqual({ ok: true });
  });

  it('allows removing an owner when another owner exists', () => {
    expect(checkLastOwnerRemoval('owner', 2)).toEqual({ ok: true });
    expect(checkLastOwnerRemoval('owner', 5)).toEqual({ ok: true });
  });

  it('blocks removing the single remaining owner', () => {
    const verdict = checkLastOwnerRemoval('owner', 1);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.message).toBe('Cannot remove the last owner');
      expect(verdict.field).toBe('role');
    }
  });

  it('blocks removing an owner when the owner count is somehow zero', () => {
    // Defence-in-depth: if a race or bad-data scenario produced a
    // count of 0 while the target row claims to be an owner, the
    // helper must still refuse the destructive delete.
    const verdict = checkLastOwnerRemoval('owner', 0);
    expect(verdict.ok).toBe(false);
  });

  it('uses exactly the 409-body shape the handler surfaces', () => {
    const verdict = checkLastOwnerRemoval('owner', 1);
    // This exact assertion locks the contract with
    // tenant-members-by-id.handler.ts DELETE — any future widening
    // of the shape here must be mirrored in the handler.
    expect(verdict).toEqual({
      ok: false,
      message: 'Cannot remove the last owner',
      field: 'role',
    });
  });

  it('ignores role string casing — exact match required', () => {
    // The canonical role values in the seed are lowercase; an upper-
    // cased value is NOT treated as owner. This is intentional: the
    // handler should be testing the row value verbatim, which the
    // DB stores in lowercase.
    expect(checkLastOwnerRemoval('OWNER', 1)).toEqual({ ok: true });
    expect(checkLastOwnerRemoval('Owner', 1)).toEqual({ ok: true });
  });

  it('treats unknown roles as non-owner', () => {
    expect(checkLastOwnerRemoval('viewer', 0)).toEqual({ ok: true });
    expect(checkLastOwnerRemoval('', 0)).toEqual({ ok: true });
  });
});

describe('checkMemberLimit', () => {
  it('allows inserting when count is strictly below the limit', () => {
    expect(checkMemberLimit(0, 50)).toEqual({ ok: true });
    expect(checkMemberLimit(1, 50)).toEqual({ ok: true });
    expect(checkMemberLimit(49, 50)).toEqual({ ok: true });
  });

  it('blocks inserting when count equals the limit', () => {
    const verdict = checkMemberLimit(50, 50);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.message).toBe('Tenant member limit reached');
      expect(verdict.limit).toBe(50);
    }
  });

  it('blocks inserting when count exceeds the limit (drift recovery)', () => {
    // If a historical insert slipped through and the tenant is above
    // the limit, the next POST must still be refused.
    expect(checkMemberLimit(99, 50)).toEqual({
      ok: false,
      message: 'Tenant member limit reached',
      limit: 50,
    });
  });

  it('treats a limit of 2 the same way as the default 50', () => {
    expect(checkMemberLimit(0, 2)).toEqual({ ok: true });
    expect(checkMemberLimit(1, 2)).toEqual({ ok: true });
    const verdict = checkMemberLimit(2, 2);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.limit).toBe(2);
  });

  it('treats a non-positive limit as "no limit"', () => {
    expect(checkMemberLimit(1000, 0)).toEqual({ ok: true });
    expect(checkMemberLimit(1000, -1)).toEqual({ ok: true });
  });

  it('treats a non-finite limit as "no limit"', () => {
    expect(checkMemberLimit(1000, Number.NaN)).toEqual({ ok: true });
    expect(checkMemberLimit(1000, Number.POSITIVE_INFINITY)).toEqual({ ok: true });
  });

  it('uses exactly the 409-body shape the handler surfaces', () => {
    const verdict = checkMemberLimit(50, 50);
    expect(verdict).toEqual({
      ok: false,
      message: 'Tenant member limit reached',
      limit: 50,
    });
  });

  it('limits the tenant at the Free-tier default of 50', () => {
    // This is the documented default in the tenants configSchema
    // (MAX_MEMBERS_PER_TENANT = 50). Regression lock.
    expect(checkMemberLimit(50, 50).ok).toBe(false);
    expect(checkMemberLimit(49, 50).ok).toBe(true);
  });
});
