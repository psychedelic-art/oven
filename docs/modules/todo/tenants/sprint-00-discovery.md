# Sprint 00 — Discovery

## Goal

Inventory the current `packages/module-tenants/` implementation,
document gaps, pick the test framework, and confirm the sprint
roadmap. Docs-only — no code ships in sprint-00.

## Deliverables

- [x] Full package inventory written to [`CODE-REVIEW.md`](./CODE-REVIEW.md)
- [x] Gap list written to [`STATUS.md`](./STATUS.md#known-gaps)
- [x] Sprint roadmap in [`README.md`](./README.md#sprint-roadmap)
- [x] Canonical doc set scaffolded in `docs/modules/tenants/` (11 files)
- [x] Test framework confirmed: `vitest` 3.2.4 (matches every other module package)

## Inventory

- **Schema**: `tenants` (7 cols + 2 indexes + unique slug),
  `tenant_members` (5 cols + 2 indexes + compound unique).
- **Handlers**: 7 files, 12 HTTP verbs (`GET` / `POST` / `PUT` /
  `DELETE`).
- **Seed**: 7 permissions + 1 public endpoint, idempotent.
- **Utils**: 1 pure function (`computeBusinessHours`).
- **ModuleDefinition**: declared with 15 configSchema entries, 5
  typed events, 3 chat action schemas.
- **Dashboard UI**: 4 resource components in the dashboard app.

## Test framework decision

`vitest` 3.2.4. Rationale:

- `module-config` uses vitest (24 tests).
- `module-notifications` uses vitest (37 tests).
- `module-ai` uses vitest (110 tests after cycle-2 F-05-01).
- No reason to introduce a second framework.

## Out of scope for sprint-00

- Wiring a `NextRequest` integration harness (sprint-03)
- Applying RLS policies (blocked on `module-auth`)
- Tenant suspension / cloning (product decisions)

## Acceptance

Sprint-00 is complete when:

- [x] `STATUS.md` reflects the current package state
- [x] `CODE-REVIEW.md` lists every gap with severity and routing
- [x] Sprint files exist for 01, 02, 03, 04
- [x] Canonical doc folder exists with 11 files

**Status**: COMPLETE — all boxes above are checked as of cycle-2.

## Rule compliance checklist

- [x] `docs/module-rules.md` — every rule audited in `CODE-REVIEW.md`
- [x] `docs/modules/20-module-config.md` — config centralization
  verified (R13)
- [x] Root `CLAUDE.md` — `import type`, MUI `sx`, error-boundary
  posture audited
