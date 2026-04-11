# Sprint 05 — Handler type safety (sort column + SDK casts)

**Sprint ID**: `sprint-05`
**Branch**: `feature/bugs`
**Owner package(s)**: `packages/module-ai`
**Related docs**: [`docs/modules/12-ai.md`](../../12-ai.md)

## Goal

Close the `as any` sort-column escape in every AI handler and add real
type guards around SDK responses.

## Integration Proposals

_To be authored by the Business Owner role after implementation._

## Findings

- [ ] **F-05-01** — `ai-playground-executions.handler.ts:13` Replace `(table as any)[params.sort]` with a whitelist lookup.
- [ ] **F-05-02** — Extract a shared `getOrderColumn(table, field, allowed)` helper into `packages/module-ai/src/api/_utils/sort.ts` and apply across all 12+ sibling handlers.
- [ ] **F-05-03** — `ai-providers-test.handler.ts:53,62,71` Type `sdkProvider` and throw a typed error when it is undefined.
- [ ] **F-05-04** — `ai-transcribe.handler.ts:17` Add a shape guard on the resolved provider before calling its client.
- [ ] **F-05-05** — `ai-generate-object.handler.ts:26` Run the schema through `zod` before passing it to the AI SDK.

## Context for the fixer

- The shared helper MUST be package-private (`_utils/sort.ts`) — do
  NOT export from `packages/module-ai/src/index.ts` unless used by
  another module.
- Allowed sort fields should be derived from a constant per handler,
  not from reflection.

## Out of scope

- Migration / schema changes.
- Adding new handlers.

## Definition of Done

All 5 findings checked off · `pnpm -F module-ai test` green · a test
file `ai-sort-guard.test.ts` that proves an unknown sort value is
rejected with a 400.
