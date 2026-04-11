# Sprint 00 — Discovery

> **Module**: config
> **Sprint**: 00
> **Goal**: Capture prior art, confirm ground-truth rules, and freeze the
> cascade semantics before any feature work.
> **Status**: Done (2026-04-11)

## Goal

Before sprint-01 touches a single line of test code, confirm that:

1. The 5-tier cascade semantics in the spec match what the current
   `packages/module-config/src/api/*` handlers actually implement.
2. Every ground-truth rules file either accepts the module or is explicitly
   amended in-sprint.
3. The external prior art and citations used in the canonical
   [`references.md`](../../config/references.md) are real, current, and
   compatible with the stack.

## Scope

- Code walk-through of the four handlers:
  - `module-configs.handler.ts`
  - `module-configs-by-id.handler.ts`
  - `module-configs-resolve.handler.ts`
  - `module-configs-resolve-batch.handler.ts`
- Spec walk-through of `docs/modules/20-module-config.md`.
- Ground-truth rules crosscheck (9 files).
- External research: read each cited project's current docs page to confirm
  the pattern claim and the URL.
- Feed findings into [`CODE-REVIEW.md`](./CODE-REVIEW.md).

## Out of Scope

- Writing tests (sprint-01).
- Building dashboard UI (sprint-02).
- Running migrations or enabling RLS (sprint-03).

## Deliverables

- [x] `todo/config/README.md`, `STATUS.md`, `PROMPT.md`, `business-owner.md`.
- [x] `todo/config/CODE-REVIEW.md` filled with a Rule Compliance section.
- [x] Canonical doc set scaffolded at `docs/modules/config/` (11 files).
- [x] `docs/modules/IMPLEMENTATION-STATUS.md` updated / created with a row
      for `config`.

## Acceptance Criteria

- [x] The cascade priority order in `module-configs-resolve.handler.ts` is
      byte-identical to the spec's section 5 pseudocode.
- [x] The canonical doc shape has all 11 files — no extras, no omissions.
- [x] The Rule Compliance table in `CODE-REVIEW.md` marks pass/fail for
      each of the 9 ground-truth files and the module's own spec.
- [x] Every external reference in `references.md` has a real, current URL and
      a one-sentence "why this is relevant" note.

## Dependencies

None. This sprint is pure research + writing.

## Risks

- **Spec drift**: the spec calls `module_configs_unique` a single unique index,
  but Drizzle can't express COALESCE indexes. The migration to create it is
  raw SQL and is scoped to sprint-03. Acknowledged.
- **References currency**: external sources (Parameter Store, Consul, etc.)
  may change their documentation layout; URLs are pinned to the landing page
  rather than deep links to reduce link rot.

## Test Plan (TDD)

This sprint produces docs only. The test plan for unit tests lives in
sprint-01. As a safeguard, this sprint produces a **testable contract**:
the `ResolveResult` and `BatchResolveResult` types in
`packages/module-config/src/types.ts` are the observable surface, and sprint-01
writes tests against that surface.

## Rule Compliance Checklist

| Rules file | Verdict | Notes |
|------------|:-------:|-------|
| `docs/module-rules.md` | PASS | Cross-checked in `CODE-REVIEW.md` table. |
| `docs/package-composition.md` | PASS | Package lives at `packages/module-config/`, matches structure. |
| `docs/routes.md` | PASS | API routes mount under `/api/module-configs/*` per spec. |
| `docs/use-cases.md` | PASS | Mapped to UC 1, 2, 3, 4, 8, 11 in `business-owner.md`. |
| `docs/modules/00-overview.md` | PASS | Config listed as Core Infrastructure in the module map. |
| `docs/modules/20-module-config.md` | PASS (authoritative) | The spec itself — not cross-checked against itself, but against the code. |
| `docs/modules/21-module-subscriptions.md` | PASS | Subscriptions is a downstream consumer; no upstream constraint on config. |
| `docs/modules/13-tenants.md` | PASS | `tenantId` column + RLS + per-tenant index as required. |
| `docs/modules/17-auth.md` | PASS | Permissions seeded, API-level enforcement documented. |
| Root `CLAUDE.md` | PASS | No UI code yet; sprint-02 must honour it. |
