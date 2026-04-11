# Module Tenants — STATUS

| Field | Value |
|---|---|
| Module | `tenants` |
| Package | `packages/module-tenants/` |
| Current sprint | `sprint-02-unit-tests.md` |
| Sprint state | **in progress** — `computeBusinessHours` coverage shipping this cycle |
| Active branch | `claude/inspiring-clarke-GA0Ok` (cycle-2 session) |
| Backup branch | none — no prior feature work |
| Open PR | none (do not create without explicit user approval) |
| Test framework | `vitest` 3.2.4 (matches module-config / module-notifications / module-ai) |
| Canonical doc set | **complete (11/11)** — scaffolded cycle-2 |
| QA verdict | n/a — no merge target this cycle |
| Blockers | none |

## Last updates

- 2026-04-11 (cycle-2) — Canonical `docs/modules/tenants/` 11-file
  shape scaffolded: `Readme.md`, `UI.md`, `api.md`, `architecture.md`,
  `database.md`, `detailed-requirements.md`, `module-design.md`,
  `prompts.md`, `references.md`, `secure.md`,
  `use-case-compliance.md`. Todo sprint plan created with 5 sprints
  (00..04). `sprint-02-unit-tests.md` is the current work target —
  `computeBusinessHours` unit tests ship this cycle to close the
  test coverage gap and provide a regression bed for the R9.1 cases.

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

- **Unit tests**: 0 (cycle-2 adds the first batch — see sprint-02).
- **Integration tests**: 0 (sprint-03).
- **Seed tests**: 0 (sprint-02 wires the idempotency assertion).

## Known gaps

| # | Gap | Severity | Sprint |
|---|---|---|---|
| 1 | `computeBusinessHours` has no unit tests | HIGH | sprint-02 (this cycle) |
| 2 | `id` leaked in public endpoint response (R3.5) | HIGH | sprint-03 |
| 3 | Last-owner guard missing on member DELETE / PUT | HIGH | sprint-03 |
| 4 | `MAX_MEMBERS_PER_TENANT` not enforced on POST members | MEDIUM | sprint-03 |
| 5 | Sort-field allowlist not applied (F-05-01 pattern) | MEDIUM | sprint-03 |
| 6 | Seed idempotency unverified by a test | MEDIUM | sprint-02 |
| 7 | RLS policies planned but not applied | MEDIUM | blocked on `module-auth` |
| 8 | Handler integration tests missing | MEDIUM | sprint-03 |
| 9 | Optimistic concurrency check on PUT missing | LOW | sprint-03 |
| 10 | Midnight-wrap schedule not supported in business-hours util | LOW | sprint-04 enhancement |

## Acceptance checklist

Mirrors the gate in
[`sprint-04-acceptance.md`](./sprint-04-acceptance.md). Updated each sprint.

- [ ] `computeBusinessHours` unit-tested per R9.1 (in progress this cycle)
- [ ] `seedTenants` idempotency verified by a test
- [ ] Public endpoint no longer leaks `id`
- [ ] Last-owner guard enforced on member DELETE and PUT (role change)
- [ ] `MAX_MEMBERS_PER_TENANT` enforced on POST members
- [ ] Sort-field allowlist applied to every list handler
- [ ] Integration tests cover every handler at `NextRequest` level
- [ ] No `style={}` in dashboard components
- [ ] `import type` for every type-only import in the package
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` lists tenants as live
- [ ] `docs/modules/todo/PROGRESS.md` updated with graduation row
