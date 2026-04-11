# Sprint 05 — Handler type safety (sort column + SDK casts)

## Goal

Close the `(table as any)[params.sort]` escape in every AI handler and
add real type guards around SDK responses.

## Scope

> **Triage update (sprint-00)**: F-05-02's "12+ siblings" is actually
> **9** on this branch (see `inventory.md` and Q-T-02). The fix is
> identical — `getOrderColumn` covers all 9 call sites.

Findings to resolve (one commit each):

- [ ] **F-05-01** — `packages/module-ai/src/api/ai-playground-executions.handler.ts:13` Replace `(table as any)[params.sort]` with a whitelist lookup.
- [ ] **F-05-02** — Extract a shared `getOrderColumn(table, field, allowed)` helper into `packages/module-ai/src/api/_utils/sort.ts` and apply across **all 9** sibling handlers on this branch: `ai-tools.handler.ts`, `ai-guardrails.handler.ts`, `ai-playground-executions.handler.ts`, `ai-usage-logs.handler.ts`, `ai-aliases.handler.ts`, `ai-budgets.handler.ts`, `ai-providers.handler.ts`, `ai-vector-stores.handler.ts`, `ai-budget-alerts.handler.ts`. Per BO IP-4 the helper stays package-private — do NOT export it from `packages/module-ai/src/index.ts`.
- [ ] **F-05-03** — `packages/module-ai/src/api/ai-providers-test.handler.ts:53,62,71` Type `sdkProvider` via a proper interface and throw a typed `Error` when it is undefined.
- [ ] **F-05-04** — `packages/module-ai/src/api/ai-transcribe.handler.ts:17` Add a shape guard on the resolved provider before calling its client.
- [ ] **F-05-05** — `packages/module-ai/src/api/ai-generate-object.handler.ts:26` Run the schema through `zod` before passing it to the AI SDK.

## Out of scope

- Schema migrations.
- Adding new handlers.
- Changing the list-envelope format (Rule 10.1 requires
  `parseListParams` + `listResponse`; do not touch them).
- Fixing React Admin list pages that *consume* these handlers —
  that's Sprint 06.

## Deliverables

- 5 commits, one per finding.
- `packages/module-ai/src/api/_utils/sort.ts` with a typed,
  allowlist-driven helper.
- A per-handler constant `ALLOWED_SORTS` naming the valid fields.
- New test file `ai-sort-guard.test.ts` proving that an unknown
  sort value is rejected with a `400`.

## Acceptance criteria

- [ ] All 5 findings checked `[x]` in this file.
- [ ] Zero `as any` remains in any file under
      `packages/module-ai/src/api/**`.
- [ ] `getOrderColumn` is NOT exported from
      `packages/module-ai/src/index.ts`.
- [ ] `pnpm -F module-ai test` green.
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [ ] **Integration Proposals** section authored by the BO role at
      the bottom of this file before the sprint closes.

## Touched packages

- `packages/module-ai` (only under `src/api/`).

## Risks

- **R1**: A consuming client may be sending a sort value that is
  currently unvalidated. Tightening will surface latent 400s.
  *Mitigation*: before this sprint lands, grep the dashboard for
  hard-coded sort values and add them to the `ALLOWED_SORTS` lists.
- **R2**: Zod validation of an `ai-generate-object` schema can reject
  inputs that the untyped version accepted. *Mitigation*: treat the
  first rejection as a test case; do not widen the validator to
  re-accept malformed schemas.

## Rule references

- `docs/module-rules.md` Rule 10.1 (`parseListParams` + `listResponse`),
  Rule 10.3 (pagination), Rule 10.4 (error shape).
- `CLAUDE.md` `type-imports`, global "never `as any`" norm.
