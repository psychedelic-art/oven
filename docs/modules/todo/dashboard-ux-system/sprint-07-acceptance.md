# Sprint 07 — Acceptance

## Goal

Prove that the dashboard UX system is coherent, tenant-aware, and
consistent end-to-end. Walk every critical user flow with a platform
admin account and a tenant admin account. Verify every program-level
acceptance row in `STATUS.md`. Graduate the program out of the todo
queue by updating `docs/modules/todo/PROGRESS.md` and
`docs/modules/IMPLEMENTATION-STATUS.md`.

## Scope

### In

- Manual walk-through with a **platform admin** account:
  1. Log in, observe the `TenantSelector` in the AppBar.
  2. Select "Dental Clinic North" — verify every tenant-scoped list
     narrows in a single render pass: tenants, agents, chat sessions,
     knowledge-base entries, workflows, notifications channels, flows,
     forms.
  3. Select "All tenants" — verify the tenant column appears in every
     tenant-scoped list.
  4. Create a new entity in admin mode (e.g. a new agent) — verify the
     tenant picker is exposed.
  5. Open each playground route (AI, KB, Agent, Workflow-agents) —
     verify the same 3-panel shell, the same command palette, the same
     inspector tabs.
- Manual walk-through with a **tenant admin** account (no
  `tenants.list` permission):
  1. Log in — verify the `TenantSelector` is not rendered.
  2. Every tenant-scoped list shows only the tenant's rows.
  3. Create a new entity — verify the tenant picker is hidden and
     `tenantId` is auto-assigned.
  4. Open each playground — verify the target selector only shows
     this tenant's resources.
- Cross-browser smoke: Chrome, Firefox, Safari (mobile breakpoints
  verified for the tenant selector drawer and the filter toolbar
  chip overflow).
- Accessibility smoke: tab order through the AppBar tenant selector,
  filter toolbar combo boxes, and playground panels; screen reader
  announces the active tenant on change.
- Final rule-compliance grep sweep:
  - `grep -rn 'style={' apps/dashboard/src packages/dashboard-ui/src`
    returns nothing new.
  - `grep -rn '<NumberInput source="tenantId"' apps/dashboard/src/components`
    returns nothing.
  - `grep -rn 'const filters = \[' apps/dashboard/src/components`
    returns nothing for tenant-scoped lists.
  - `grep -rn '<Typography variant="overline"' apps/dashboard/src/components/CustomMenu.tsx`
    returns nothing.
  - Every tenant-scoped `*List.tsx` contains `useTenantContext`.
- Aggregate test count: report total `vitest` count for
  `packages/dashboard-ui/` and confirm it meets the success criteria
  in [`business-owner.md`](./business-owner.md) (≥ 30 unit tests).
- Graduation:
  - Update `docs/modules/todo/PROGRESS.md` with a new row for
    `dashboard-ux-system` under "Active queue" → move to a new
    "Graduated programs" section with the commit SHA of sprint-07.
  - Update `docs/modules/IMPLEMENTATION-STATUS.md` with a new
    "Dashboard UX System" section mirroring the
    per-module format: table of areas, status, deliverables.
  - Decide whether to delete the todo folder or keep it for history —
    this program is a sibling of `oven-bug-sprint`, which is kept for
    history, so default to **keep** until the user decides otherwise.

### Out

- Any new feature
- Any new test file other than smoke tests for acceptance walkthroughs
- Any change to `@oven/agent-ui` or module packages

## Deliverables

1. `docs/modules/todo/dashboard-ux-system/acceptance-report.md` with
   the full walk-through log, grep checksums, test counts, and
   screenshots (referenced by path, not embedded).
2. `docs/modules/todo/PROGRESS.md` updated with the graduation row.
3. `docs/modules/IMPLEMENTATION-STATUS.md` updated with the Dashboard
   UX System section.
4. `STATUS.md` final state: every row in the acceptance checklist
   checked; sprint-07 marked `done`.
5. Commit: `docs(dashboard-ux-system): sprint-07 acceptance report`
6. Commit: `docs(progress): graduate dashboard-ux-system`
7. Commit: `docs(implementation-status): record dashboard-ux-system completion`

## Acceptance criteria

- [ ] `acceptance-report.md` exists and contains the full walk-through
  log for both admin and tenant admin accounts.
- [ ] Every row in `STATUS.md` acceptance checklist is checked.
- [ ] Every grep check listed above returns the expected result.
- [ ] Aggregate `vitest` count for `@oven/dashboard-ui` ≥ 30 tests,
  green on first run.
- [ ] `pnpm --filter dashboard typecheck` exits 0.
- [ ] `pnpm --filter dashboard build` exits 0.
- [ ] `docs/modules/todo/PROGRESS.md` has a new row marking
  `dashboard-ux-system` as graduated.
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` has a new section
  describing the program's landed surface.
- [ ] No production branch push is performed — graduation stays on
  `claude/dashboard-ux-system-nESUZ` until the user approves a PR.

## Dependencies

- All prior sprints (00–06) complete
- A two-tenant test account set up on the dev environment (re-use
  the dental-project test tenants)
- Root `CLAUDE.md` rules — final grep sweep gates the graduation

## Risks

- **Regressions found during walk-through** — inevitable. Mitigation:
  file each regression as a follow-up sprint in `STATUS.md` (not new
  commits to this sprint) and graduate anyway if the regression is
  cosmetic. Do not graduate with a Rule 6.3 or 6.4 regression.
- **Missing tenant on a new module created between sprint-02 audit and
  now** — mitigation: re-run the sprint-02 audit grep as the first
  step of sprint-07 and diff against the audit table. Any delta is
  migrated before the acceptance walk-through begins.
- **Flaky `UnifiedAIPlayground` in the walk-through** — this is the
  only external surface touched by acceptance. Mitigation: if the
  playground shell is flaky, file a bug against `@oven/agent-ui` and
  retest; do not patch the shell in this sprint.

## Test plan

- Run `pnpm --filter @oven/dashboard-ui test` and record the result.
- Run `pnpm --filter dashboard typecheck`.
- Run `pnpm --filter dashboard build`.
- Manual walk-through with a platform admin account across every
  module list + every playground.
- Manual walk-through with a tenant admin account across the same
  surface.
- Mobile breakpoint walk-through at `xs` and `sm`.
- Accessibility walk-through with keyboard only and with a screen
  reader.

## Rule compliance checklist

- [ ] Rule 6.1 — CRUD convention held across every module
- [ ] Rule 6.2 — menu sections use `MenuSectionLabel`
- [ ] Rule 6.3 — every tenant-scoped list reads `useTenantContext`
- [ ] Rule 6.4 — every tenant-scoped create form auto-assigns
  `tenantId`
- [ ] Rule 6.5 — custom editors still linked from edit pages
- [ ] Root `CLAUDE.md` `no-inline-styles` — zero `style={}` drift
- [ ] Root `CLAUDE.md` `mui-sx-prop` — dashboard + `@oven/dashboard-ui`
  use `sx` only
- [ ] Root `CLAUDE.md` `tailwind-cn-utility` — Tailwind confined to
  `@oven/agent-ui` and `@oven/oven-ui`
- [ ] Root `CLAUDE.md` `zustand-store-pattern` — tenant store still
  per-instance via factory + React context
- [ ] Root `CLAUDE.md` `type-imports` — every type-only import uses
  `import type`
