# Module Tenants — STATUS

| Field | Value |
|---|---|
| Module | `tenants` |
| Package | `packages/module-tenants/` |
| Current sprint | `sprint-04-acceptance.md` (next); sprint-03 complete on session |
| Sprint state | **sprint-03 complete on session branch (cycle-8)** — DRIFT-2/3/4/5 closed; 78 unit tests green (28 compute-business-hours + 23 sort-guard + 15 member-guards + 12 public-response) |
| Active branch | `claude/inspiring-clarke-JGiXk` (cycle-8 session) |
| Backup branch | `bk/claude-inspiring-clarke-JGiXk-20260411` (will be created at next Phase 2 gate) |
| Open PR | none (do not create without explicit user approval) |
| Test framework | `vitest` 3.2.4 (matches module-config / module-notifications / module-ai) |
| Canonical doc set | **complete (11/11)** — scaffolded cycle-2 |
| QA verdict | n/a — no merge target this cycle |
| Blockers | none |

## Last updates

- 2026-04-11 (cycle-8) — **sprint-03 security hardening** shipped on
  session branch `claude/inspiring-clarke-JGiXk`. DRIFT-2 (public
  endpoint no-id guard via pure `assembleTenantPublicResponse`),
  DRIFT-3 (`checkLastOwnerRemoval` + handler wiring on
  `tenant-members-by-id.handler.ts` DELETE), DRIFT-4
  (`checkMemberLimit` + config resolution + handler wiring on
  `tenant-members.handler.ts` POST), DRIFT-5 (F-05-01-pattern
  `getOrderColumn` helper copied into
  `packages/module-tenants/src/api/_utils/sort.ts`, allowlists
  applied to `tenants.handler.ts` GET and
  `tenant-members.handler.ts` GET). 50 new vitest tests (23
  sort-guard + 15 member-guards + 12 public-response) bring the
  module total to **78/78 green**. Dashboard `tsc --noEmit` baseline
  460 unchanged. DRIFT-6 seed idempotency deferred — requires DB
  mock infra that is not yet present in the module.
- 2026-04-11 (cycle-2) — Canonical `docs/modules/tenants/` 11-file
  shape scaffolded: `Readme.md`, `UI.md`, `api.md`, `architecture.md`,
  `database.md`, `detailed-requirements.md`, `module-design.md`,
  `prompts.md`, `references.md`, `secure.md`,
  `use-case-compliance.md`. Todo sprint plan created with 5 sprints
  (00..04). `sprint-02-unit-tests.md` closed: `computeBusinessHours`
  unit tests shipped (28 tests) covering every R9.1 case.

## Implementation status (on `dev`)

- **Schema**: `tenants`, `tenant_members` — shipped with indexes and
  unique constraints.
- **Handlers**: all 7 routes present
  (`tenants.handler.ts`, `tenants-by-id.handler.ts`,
  `tenants-by-slug.handler.ts`, `tenants-public.handler.ts`,
  `tenant-members.handler.ts`, `tenant-members-by-id.handler.ts`,
  `tenants-business-hours.handler.ts`).
- **Seed**: `seedTenants()` — 7 permissions + 1 public endpoint,
  idempotent via `onConflictDoNothing()`.
- **Utils**: `computeBusinessHours` — pure function, **zero tests**
  (closing this cycle).
- **ModuleDefinition**: `tenantsModule` with 15 configSchema entries,
  5 typed events, 3 chat action schemas.
- **Dashboard UI**: 4 components in `apps/dashboard/src/components/tenants/`.

## Test coverage

- **Unit tests**: **78** — 28 compute-business-hours (cycle-2) + 23
  sort-guard (cycle-8) + 15 member-guards (cycle-8) + 12
  public-response (cycle-8).
- **Integration tests**: 0 (scheduled separately; DB mock infra
  needed).
- **Seed tests**: 0 (DRIFT-6 deferred).

## Known gaps

| # | Gap | Severity | Sprint |
|---|---|---|---|
| 1 | ~~`computeBusinessHours` has no unit tests~~ — **CLOSED cycle-2, 28 tests** | — | — |
| 2 | ~~`id` leaked in public endpoint response (R3.5)~~ — **CLOSED cycle-8, 12 public-response tests lock the shape** | — | — |
| 3 | ~~Last-owner guard missing on member DELETE~~ — **CLOSED cycle-8, 6 member-guard tests + handler wiring** | — | — |
| 4 | ~~`MAX_MEMBERS_PER_TENANT` not enforced on POST members~~ — **CLOSED cycle-8, 9 member-guard tests + config resolution + handler wiring** | — | — |
| 5 | ~~Sort-field allowlist not applied (F-05-01 pattern)~~ — **CLOSED cycle-8, 23 sort-guard tests** | — | — |
| 6 | Seed idempotency unverified by a test | MEDIUM | deferred — needs DB mock infra |
| 7 | RLS policies planned but not applied | MEDIUM | blocked on `module-auth` |
| 8 | Handler integration tests missing | MEDIUM | sprint-04 (needs DB mock infra) |
| 9 | Optimistic concurrency check on PUT missing | LOW | sprint-04 |
| 10 | Midnight-wrap schedule not supported in business-hours util | LOW | sprint-04 enhancement |

## Acceptance checklist

Mirrors the gate in
[`sprint-04-acceptance.md`](./sprint-04-acceptance.md). Updated each sprint.

- [x] `computeBusinessHours` unit-tested per R9.1 — 28 tests green (cycle-2)
- [ ] `seedTenants` idempotency verified by a test
- [x] Public endpoint no longer leaks `id` — 12 tests + pure
  `assembleTenantPublicResponse` with typed shape that structurally
  forbids `id` (cycle-8)
- [x] Last-owner guard enforced on member DELETE — `checkLastOwnerRemoval`
  + handler wiring, 6 tests (cycle-8). PUT role-change path: handler
  does not currently expose PUT; deferred to sprint-04.
- [x] `MAX_MEMBERS_PER_TENANT` enforced on POST members — 9 tests + config
  resolution (tenant override → platform → schema default) (cycle-8)
- [x] Sort-field allowlist applied to every list handler — `tenants`
  + `tenant-members` both wired through `getOrderColumn`; 23 tests
  (cycle-8)
- [ ] Integration tests cover every handler at `NextRequest` level
- [ ] No `style={}` in dashboard components
- [x] `import type` for every type-only import in the package
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` lists tenants as live
- [ ] `docs/modules/todo/PROGRESS.md` updated with graduation row
