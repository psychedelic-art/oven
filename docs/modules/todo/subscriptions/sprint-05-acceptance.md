# Sprint 05 — Terminal Acceptance

## Goal

Graduate `subscriptions` out of `docs/modules/todo/` by running every
ground-truth rule gate, running every test, and verifying the dashboard
golden path end-to-end.

## Scope

- Run the full rule-compliance checklist from `docs/module-rules.md`.
- Run `pnpm --filter @oven/module-subscriptions test`.
- Run `pnpm --filter @oven/module-ai test` to confirm the quota
  contract is still honored.
- Manual dashboard walkthrough: platform admin plan CRUD, tenant
  admin usage view, public pricing page render.
- Update `docs/modules/IMPLEMENTATION-STATUS.md` marking subscriptions
  as LIVE.
- Delete `docs/modules/todo/subscriptions/` in the same commit that
  publishes graduation.

## Out of Scope

- Future features (Stripe webhook sync, self-serve upgrade).

## Deliverables

- `docs/modules/IMPLEMENTATION-STATUS.md` — updated row.
- A graduation commit with message
  `graduate(subscriptions): …` that deletes the todo folder and
  updates the implementation status.

## Acceptance Criteria

- [ ] All sprint-01..04 acceptance checklists are complete.
- [ ] `pnpm --filter @oven/module-subscriptions test` — all green.
- [ ] `pnpm --filter @oven/module-ai test` — still green
      (regression guard).
- [ ] `docs/modules/subscriptions/` has all 11 canonical files with
      no placeholders.
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` marks subscriptions
      LIVE.
- [ ] Dashboard golden path: platform admin creates a plan → assigns
      quotas → subscribes a tenant → tenant admin sees the usage
      meter populated.
- [ ] Portal golden path: public pricing page renders all plans
      with no internal columns leaked.
- [ ] `docs/modules/todo/subscriptions/` deleted in the graduation
      commit.

## Dependencies

- Sprints 00..04 all complete.

## Risks

- **Low**: any uncovered DRIFT from sprint-00 that was deferred
  to "later" must be closed here or the graduation is blocked.

## Test Plan

- Every earlier sprint's tests.
- Manual golden-path walkthroughs above.

## Rule Compliance Checklist

- [ ] Every entry from the Phase-2 ground-truth rules list has been
      explicitly verified:
  - [ ] `docs/module-rules.md`
  - [ ] `docs/package-composition.md`
  - [ ] `docs/routes.md`
  - [ ] `docs/use-cases.md`
  - [ ] `docs/modules/00-overview.md`
  - [ ] `docs/modules/20-module-config.md`
  - [ ] `docs/modules/21-module-subscriptions.md`
  - [ ] `docs/modules/13-tenants.md`
  - [ ] `docs/modules/17-auth.md`
  - [ ] Root `CLAUDE.md` — MUI sx, Tailwind cn, import type,
        zustand factory, no inline style, boundary error handling.
  - [ ] Canonical 11-file shape in `docs/modules/subscriptions/`.
