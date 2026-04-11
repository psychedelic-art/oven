# QA Report — `claude/inspiring-clarke-JGiXk`

**Audit date:** 2026-04-11
**Cycle:** cycle-8
**Session branch:** `claude/inspiring-clarke-HBa3u`
**Backup branch:** `bk/claude-inspiring-clarke-JGiXk-20260411`
**Tip commit:** `0da8047 feat(tenants): sprint-03 security hardening — DRIFT-2/3/4/5 (+50 tests)`
**Merge base vs `origin/dev`:** `26d6e1b` (current `dev` HEAD, cycle-7 landing)
**Ahead of dev:** 4 commits
**Behind dev:** 0

## Branch relationship

JGiXk is a clean linear extension of `origin/dev` after the cycle-7
landing. `git rev-list --count origin/dev..origin/claude/inspiring-clarke-JGiXk = 4`
and `git rev-list --count origin/claude/inspiring-clarke-JGiXk..origin/dev = 0`,
which means the branch is fast-forwardable: no rebase, no conflict
resolution required. Landing it via `--no-ff` keeps the merge as a
single identifiable commit on `dev`.

Chronological commits introduced on top of `dev`:

| # | SHA | Kind | Subject |
|---|-----|------|---------|
| 1 | `a296c0a` | docs | `docs(qa): QA report for claude/inspiring-clarke-LSksg (cycle-7)` |
| 2 | `d16bb36` | merge | `merge(session): sync session branch with dev post cycle-7 landing` |
| 3 | `68bb0c5` | docs | `docs(todo): regenerate progress after cycle-7 landing on dev` |
| 4 | `0da8047` | feat + test | `feat(tenants): sprint-03 security hardening — DRIFT-2/3/4/5 (+50 tests)` |

Commits 1–3 are housekeeping carried over from the prior cycle. Commit
4 is the substantive sprint-03 ship.

### Phase 0 candidate set (cycle-8)

Two branches are ahead of `dev` on `origin`:

| Branch | Ahead | Behind | Status |
|--------|-------|--------|--------|
| `claude/inspiring-clarke-JGiXk` | 4 | 0 | **this report** |
| `claude/qa-test-todo-module-K2tpT` | 1 | 40 | blocked (tsbuildinfo only — see its own report) |

All other `claude/inspiring-clarke-*` branches show `ahead=0` because
their content has already landed on `dev` through prior cycles.

### Shared unmerged ancestors

`git log --format=%H` over `dev..JGiXk` and `dev..K2tpT` produces
five distinct SHAs (`a296c0a`, `d16bb36`, `68bb0c5`, `0da8047`,
`1ffa9c1`) with no overlap. There are zero shared unmerged ancestors;
no preliminary landing is required before either branch's merge.

## Summary

Sprint-03 (`docs/modules/todo/tenants/sprint-03-security-hardening.md`)
ships four DRIFT findings and defers one. The ship pattern matches the
oven-bug-sprint F-05-01 / F-05-02 playbook: pure decision helpers in a
new `_utils/` directory, exhaustively unit-tested without a Drizzle
mock; handlers reduced to "DB I/O + helper call".

| Finding | Verdict | Mechanism |
|---------|---------|-----------|
| **DRIFT-2** R3.5 numeric `id` leak on `GET /api/tenants/[slug]/public` | **fixed** | New `_utils/public-response.ts` with `assembleTenantPublicResponse(...)` whose typed return `TenantPublicResponse` structurally omits `id`, `slug`, `enabled`, `metadata`, `createdAt`, `updatedAt`. Future drift fails `tsc`. |
| **DRIFT-3** Last-owner deletion not blocked on `DELETE /api/tenant-members/[id]` | **fixed** | New `_utils/member-guards.ts::checkLastOwnerRemoval(role, ownerCount)` returning `{ ok: false, message: 'Cannot remove the last owner', field: 'role' }`. Handler now `SELECT count(*) WHERE role='owner'` before delete and surfaces the verdict as a 409. |
| **DRIFT-4** `MAX_MEMBERS_PER_TENANT` not enforced on `POST /api/tenant-members` | **fixed** | `checkMemberLimit(currentCount, maxMembers)` with non-finite/non-positive guard treated as "no limit". Handler resolves the limit via tenant-scoped → platform-scoped → schema default lookup against `moduleConfigs`, then runs `SELECT count(*)` and surfaces `{ error: 'Tenant member limit reached', limit }` as 409. |
| **DRIFT-5** Sort field whitelist on `GET /api/tenants` and `GET /api/tenant-members` | **fixed** | New `_utils/sort.ts::getOrderColumn(table, field, allowed)` — verbatim copy of `packages/module-ai/src/api/_utils/sort.ts` per BO rule IP-4. Both handlers now consume the typed `SortResolution` and surface 400s with the full allowlist on a violation. Prototype-key bypass (`__proto__`, `constructor`) is rejected. |
| **DRIFT-6** Seed idempotency | **deferred** | Documented in commit body: the module has no DB-mock infra and the seed already uses `onConflictDoNothing()`. Tracked in sprint-03 STATUS for a follow-up. |

## Bugs found

None. The diff is internally consistent and the unit tests cover both
the happy path and the defence-in-depth fallbacks (zero owner count
with an `owner` target, non-finite member-limit, prototype-key sort
bypass, cross-table column smuggling).

## Rule compliance (one line per ground-truth file)

| File | Verdict |
|------|---------|
| `docs/module-rules.md` | **PASS** — Rule 3.1 (no cross-module imports): `sort.ts` is a verbatim duplicate, not an import from `@oven/module-ai`. Rule 6.1 (CRUD convention): `tenants.handler.ts` and `tenant-members.handler.ts` keep their existing GET/POST/DELETE signatures intact. No new exports added to `packages/module-tenants/src/index.ts`. |
| `docs/package-composition.md` | **PASS** — `module-tenants` continues to depend only on `module-registry`, `module-roles`, `module-config`. No new workspace deps. |
| `docs/routes.md` | **PASS** — No new routes; only existing `tenants/*` and `tenant-members/*` handler bodies edited. |
| `docs/use-cases.md` | **PASS** — owner protection (UC-13.5) and member-limit enforcement (UC-13.6) explicitly listed in the dental-project use cases are now backed by code. |
| `docs/modules/00-overview.md` | **PASS** — Module remains in the "tenants" lane; no responsibilities crossed. |
| `docs/modules/20-module-config.md` | **PASS** — Direct `db.select(...).from(moduleConfigs)` reads inside `tenant-members.handler.ts` are the documented intra-process resolution pattern (tenant override → platform default → schema default). Same pattern as `tenants-public.handler.ts`. |
| `docs/modules/21-module-subscriptions.md` | **PASS** — Untouched. `MAX_MEMBERS_PER_TENANT` is a tenant-level config key, not a subscription gate. |
| `docs/modules/13-tenants.md` | **PASS** — R3.5 (no numeric id on public endpoint) is now structurally enforced. |
| `docs/modules/17-auth.md` | **PASS** — No auth surface changed; the guards run inside the existing handler boundary. |
| `docs/modules/tenants/*` | **PASS** — Canonical doc shape was already complete (11/11) on `dev`; this branch does not touch the doc folder. |
| Root `CLAUDE.md` | **PASS** — `import type` used for type-only imports (`PgColumn`, `PgTable` in `sort.ts`); no `style={}` (backend-only); error handling stays at the HTTP boundary (`NextResponse.json(..., { status: 409 })`); no zustand changes (this is a Node-side module). |

## Style violations

None. The diff is entirely backend TypeScript — no JSX, no MUI, no
Tailwind, no zustand. `import type` is honoured for the only
type-only imports (`drizzle-orm/pg-core` types in `sort.ts` and the
inline `type TenantPublicResolvedConfig` in `tenants-public.handler.ts`).

## Test gaps

None blocking. Recommended follow-ups (already documented for the next
sprint):

1. **`tenant-members.handler.ts` POST integration test** that wires a
   real `moduleConfigs` row through to the `checkMemberLimit` verdict.
   Deferred with DRIFT-6 because it needs the DB-mock harness.
2. **`tenants-public.handler.ts` integration test** that asserts the
   live HTTP body has no `id` key. The pure-assembler test covers the
   contract; the integration test would catch a regression where the
   handler bypasses `assembleTenantPublicResponse` and serialises
   `tenant` directly.

## Test execution

```
$ pnpm -F @oven/module-tenants test
 ✓ src/__tests__/compute-business-hours.test.ts (28 tests) 25ms
 ✓ src/__tests__/member-guards.test.ts (15 tests) 7ms
 ✓ src/__tests__/public-response.test.ts (12 tests) 7ms
 ✓ src/__tests__/sort-guard.test.ts (23 tests) 5ms

 Test Files  4 passed (4)
      Tests  78 passed (78)
```

`28 → 78` tests (`+50`) — matches the sprint-03 commit body. The
prior cycle-7 baseline was 28 tests (compute-business-hours only).

## Typecheck delta

```
$ pnpm -F @oven/dashboard exec tsc --noEmit | grep -c "error TS"
460
```

Identical to `dev` baseline (`26d6e1b`). The pre-existing 460 errors
all originate from `packages/workflow-editor/` peer-dep React typing
and `RouteHandler` context-param patterns in
`module-subscriptions` / `module-tenants`; none of those files are
touched by this branch. Zero regressions.

## Recommendation

**MERGE.** The branch is fast-forwardable, well-tested, structurally
type-safe, doc-aligned, and lands four security findings without
introducing tech debt.
