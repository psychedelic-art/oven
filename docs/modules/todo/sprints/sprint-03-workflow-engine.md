# Sprint 03 — Workflow engine correctness

**Sprint ID**: `sprint-03`
**Branch**: `feature/bugs`
**Owner package(s)**: `packages/module-workflows`, `packages/module-config`
**Related docs**: [`docs/workflows/engine.md`](../../../workflows/engine.md)

## Goal

Harden the workflow engine: stop emitting phantom versions, stabilize
infinite-loop detection, and return real HTTP errors instead of
swallowing malformed payloads.

## Integration Proposals

_To be authored by the Business Owner role after implementation._

## Findings

- [ ] **F-03-01** — `module-workflows/src/api/workflows-by-id.handler.ts:47` Use a canonicalized structural compare (sort keys, strip insignificant whitespace) before bumping the version.
- [ ] **F-03-02** — `module-workflows/src/engine/engine.ts:237` Replace `JSON.stringify(machineContext)` with a bounded depth-counter or a `Set<stateId>` visited set.
- [ ] **F-03-03** — `module-workflows/src/api/workflows-execute.handler.ts:20-23` Distinguish empty body (`""`) from parse error. Return `400 Invalid JSON` on failure, empty object on empty body only.
- [ ] **F-03-04** — `module-config/src/api/module-configs.handler.ts:43` Mirror the pattern from `workflows-compile.handler.ts` (safe parse with `.catch`).

## Context for the fixer

- Read `packages/module-workflows/src/engine/engine.test.ts` for existing
  loop-detection tests. Add a case that proves the old
  `JSON.stringify` approach would have failed.
- The canonical compare helper can live in
  `packages/module-workflows/src/engine/canonicalize.ts` if it does
  not already exist.

## Out of scope

- Editor UI bugs in `packages/workflow-editor` (future sprint).
- Workflow schema changes.

## Definition of Done

All 4 findings checked off · new regression test for F-03-01 proving
whitespace-only changes no longer bump the version · engine tests green.
