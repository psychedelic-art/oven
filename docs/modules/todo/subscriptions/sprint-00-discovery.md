# Sprint 00 — Discovery

## Goal

Produce a comprehensive drift report between
`docs/modules/21-module-subscriptions.md`, the freshly scaffolded
canonical doc set under `docs/modules/subscriptions/`, and the current
code in `packages/module-subscriptions/`. Every drift is filed as an
acceptance item on a later sprint.

## Scope

- Static-read-only audit. No code changes.
- Walk: top-level spec → canonical → code. For each `§` section in
  the spec, confirm the canonical file covers it and the code
  implements it.
- Tag each gap as `DRIFT-N` (follow the existing DRIFT-0..4 in
  `CODE-REVIEW.md`).

## Out of Scope

- Writing new code.
- Adding new features (everything is a drift-closure item).
- Sprint-04 dashboard UI decisions.

## Deliverables

- Update to `CODE-REVIEW.md` with DRIFT-5..N as needed.
- Update to `STATUS.md` marking sprint-00 complete.
- A bullet list under each later sprint's "Inputs from sprint-00"
  section.

## Acceptance Criteria

- [ ] Every section of `21-module-subscriptions.md` §1..§12 has been
      mapped to the corresponding canonical file.
- [ ] Every table in `schema.ts` has a row in `database.md`.
- [ ] Every handler in `src/api/*.handler.ts` has an entry in `api.md`.
- [ ] The limit-resolution algorithm in §5 of the top-level spec is
      the **identical algorithm** stated in `module-design.md`. Any
      divergence is DRIFT-X.
- [ ] `CODE-REVIEW.md` DRIFT-1..4 from the scaffolding session have
      been either confirmed still open or re-classified.

## Dependencies

- None. Pure read-only audit.

## Risks

- **Low**: the 887-line top-level spec is dense and it's easy to miss
  a subsection. Mitigation: use `grep -n '^###'` on the spec and walk
  each heading mechanically.

## Test Plan

- Not applicable (docs-only sprint).

## Rule Compliance Checklist

- [ ] Canonical doc shape verified (11 files present, no placeholders).
- [ ] `docs/module-rules.md` Rule 1..6 explicitly mapped.
- [ ] `docs/package-composition.md` layer respected.
- [ ] `docs/routes.md` every live route listed (DRIFT-2 closure).
- [ ] `docs/use-cases.md` UC-04 + UC-07 satisfied.
- [ ] `docs/modules/00-overview.md` placement correct.
- [ ] `docs/modules/13-tenants.md` tenant scoping enforced on every
      CRUD handler.
- [ ] `CLAUDE.md` `import type` grep gate PASS for
      `packages/module-subscriptions/src/**/*`.
