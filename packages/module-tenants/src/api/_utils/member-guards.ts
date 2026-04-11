/**
 * Pure decision helpers for tenant-member mutation guards. Extracted
 * to a separate file so they can be unit-tested without mocking
 * Drizzle. Sprint-03 findings DRIFT-3 and DRIFT-4.
 *
 * The handlers in `packages/module-tenants/src/api/` own the DB
 * reads (SELECT count, etc.) and funnel the counts through these
 * helpers to get a typed verdict. That keeps the actual branching
 * logic small, deterministic, and test-covered.
 */

/**
 * Verdict returned by `checkLastOwnerRemoval`. `ok = false` means the
 * handler must surface a `409 Conflict` with the `message` field as
 * the response error body.
 */
export type LastOwnerVerdict =
  | { ok: true }
  | { ok: false; message: string; field: 'role' };

/**
 * Decide whether removing (or demoting) a member would leave the
 * tenant without any owner. The handler passes:
 *   - `targetRole`: the role of the member being removed or demoted
 *     (`'owner' | 'admin' | 'member' | <any>`). Non-owner rows short-
 *     circuit to `ok: true` — they cannot be the "last owner".
 *   - `currentOwnerCount`: `SELECT count(*) FROM tenant_members WHERE
 *     tenant_id = $1 AND role = 'owner'`.
 *
 * Returns `{ ok: false, message, field: 'role' }` when the target row
 * is the single remaining owner (count is 1 AND target row's role is
 * 'owner'). This exact shape matches the sprint-03 spec and gets
 * serialised straight into the `409 Conflict` body by the handler.
 *
 * DRIFT-3: `packages/module-tenants/src/api/tenant-members-by-id.handler.ts`
 * DELETE.
 */
export function checkLastOwnerRemoval(
  targetRole: string,
  currentOwnerCount: number,
): LastOwnerVerdict {
  if (targetRole !== 'owner') {
    return { ok: true };
  }
  if (currentOwnerCount <= 1) {
    return {
      ok: false,
      message: 'Cannot remove the last owner',
      field: 'role',
    };
  }
  return { ok: true };
}

/**
 * Verdict returned by `checkMemberLimit`. `ok = false` means the
 * handler must surface a `409 Conflict` carrying the configured
 * `maxMembers` limit so the client can display a sensible error.
 */
export type MemberLimitVerdict =
  | { ok: true }
  | { ok: false; message: string; limit: number };

/**
 * Decide whether adding one more member would exceed the tenant's
 * `MAX_MEMBERS_PER_TENANT` limit. The handler passes:
 *   - `currentCount`: `SELECT count(*) FROM tenant_members WHERE
 *     tenant_id = $1`.
 *   - `maxMembers`: resolved `tenants.MAX_MEMBERS_PER_TENANT` for the
 *     target tenant (tenant override → platform default → schema
 *     default of 50).
 *
 * A non-finite or non-positive `maxMembers` is treated as "no limit"
 * (returns `{ ok: true }`). This matches the config-system contract
 * where a missing/invalid numeric config falls through to the
 * permissive default rather than blocking legitimate inserts.
 *
 * DRIFT-4: `packages/module-tenants/src/api/tenant-members.handler.ts`
 * POST.
 */
export function checkMemberLimit(
  currentCount: number,
  maxMembers: number,
): MemberLimitVerdict {
  if (!Number.isFinite(maxMembers) || maxMembers <= 0) {
    return { ok: true };
  }
  if (currentCount >= maxMembers) {
    return {
      ok: false,
      message: 'Tenant member limit reached',
      limit: maxMembers,
    };
  }
  return { ok: true };
}
