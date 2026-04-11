# Sprint 04 — Acceptance + Graduation

> **Module**: config
> **Sprint**: 04
> **Goal**: Verify every acceptance gate is green and graduate the module from
> `docs/modules/todo/config/` to `docs/modules/config/` (the canonical doc
> set is already at the target location; graduation removes the todo folder).
> **Status**: Pending (gated on sprints 01–03)

## Goal

Close out the module. Prove every ground-truth rule is satisfied. Remove the
todo folder. Flip `IMPLEMENTATION-STATUS.md` from "In Progress" to "Shipped".

## Scope

- Final rule-compliance sweep across `docs/modules/config/*.md`.
- End-to-end smoke in the dashboard: create / edit / delete / resolve / batch
  resolve across both tenant-scoped and platform-global entries.
- Confirmation that `module-tenants`, `module-subscriptions`,
  `module-notifications`, and `module-workflows` read config through the
  public API (grep for any remaining direct `moduleConfigs` imports).
- Remove `docs/modules/todo/config/` in a dedicated commit.

## Out of Scope

- New features. If the acceptance sweep surfaces a gap, it is logged as a
  new sprint and this sprint re-opens later.

## Deliverables

- [ ] Final `QA-REPORT.md` merged into `CODE-REVIEW.md` with a green
      recommendation.
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` row for `config` flipped to
      `Shipped` with the commit SHA of the graduating merge.
- [ ] `docs/modules/todo/README.md` audit table updated to remove the `config`
      row.
- [ ] `docs/modules/todo/PROGRESS.md` regenerated without the `config` row.
- [ ] `docs/modules/todo/config/` deleted (**destructive — requires
      AskUserQuestion approval before execution per the prompt's
      irreversible-action rule**).

## Acceptance Criteria

1. **Every ground-truth rules file passes** in the final Rule Compliance
   table.
2. **Unit tests green** — `pnpm --filter @oven/module-config test`.
3. **Integration smoke green** — list / create / edit / delete / resolve /
   batch resolve from the dashboard against a Neon preview branch.
4. **RLS verified** — cross-tenant read blocked, platform-global read allowed
   for all tenants, superadmin read allowed across tenants.
5. **No dead imports** — grep proves no module imports `@oven/module-workflows/schema`
   to access `moduleConfigs` (the table now lives in `@oven/module-config/schema`).
6. **Dashboard CLAUDE.md compliance** — no `style={}`, no hand-written CSS
   classes, no `styled()`, `import type` used.
7. **Canonical doc shape intact** — 11 files present in `docs/modules/config/`,
   no extras, no omissions.

## Dependencies

- sprint-01 (tests) green and merged.
- sprint-02 (dashboard UI) green and merged.
- sprint-03 (RLS + migration) green and merged.

## Risks

- **AskUserQuestion pause** at the todo-folder deletion step. That is
  intentional and required by the execution-assurances section of the prompt.

## Test Plan

- Re-run every test suite under `packages/module-config/` and confirm green.
- Dashboard smoke: full CRUD + cascade resolve + batch resolve.
- Grep for lingering references to `module-workflows/schema#moduleConfigs`.

## Rule Compliance Checklist — Final Sweep

- [ ] `docs/module-rules.md` — all 12 rules pass (re-confirm in final sweep).
- [ ] `docs/package-composition.md` — package shape unchanged since sprint-00.
- [ ] `docs/routes.md` — API routes mounted under `/api/module-configs/*`.
- [ ] `docs/use-cases.md` — UC 1, 2, 3, 4, 8, 11 covered.
- [ ] `docs/modules/00-overview.md` — module map shows `config` graduated.
- [ ] `docs/modules/20-module-config.md` — authoritative spec reflects any
      updates landed during sprints 01–03.
- [ ] `docs/modules/13-tenants.md` — tenant scoping validated.
- [ ] `docs/modules/17-auth.md` — permissions seeded and enforced.
- [ ] Root `CLAUDE.md` — styling, type imports, zustand factory,
      no inline `style={}`.
