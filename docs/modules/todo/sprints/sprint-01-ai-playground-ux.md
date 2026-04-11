# Sprint 01 — AI Playground UX & type safety

**Sprint ID**: `sprint-01`
**Branch**: `feature/bugs`
**Owner package(s)**: `apps/dashboard/src/components/ai`
**Related docs**: [`docs/modules/12-ai.md`](../../12-ai.md), [`CLAUDE.md`](../../../../CLAUDE.md)

## Goal

Stabilize the AI Playground UI. Eliminate `as any` casts, add error
boundaries, fix the Generate button state, and surface history-load
failures to the user.

## Integration Proposals

_To be authored by the Business Owner role after implementation._

## Findings

- [ ] **F-01-01** — `AIPlayground.tsx:591,594` Replace `as any` on image output URL with `ImageOutput` type guard.
- [ ] **F-01-02** — `AIPlayground.tsx:775` Type the `generate` response so `tokens.input/output/total` are required.
- [ ] **F-01-03** — `AIPlayground.tsx:1220-1227` Exit early after `setError('Invalid JSON schema')`; never pass undefined to downstream call.
- [ ] **F-01-04** — `AIPlayground.tsx:49-62` Wrap `sessionStorage.setItem` in try/catch with in-memory fallback.
- [ ] **F-01-05** — `PlaygroundExecutionShow.tsx:24` Type the `record` prop as `PlaygroundExecution`.
- [ ] **F-01-06** — `PlaygroundExecutionList.tsx:60,71` Same, + consider extracting a typed `FunctionField` wrapper (only if 3+ call sites).
- [ ] **F-01-07** — `AIPlayground.tsx:812-821` Add `disabled={!model || loading}` to the Generate button.
- [ ] **F-01-08** — `AIPlayground.tsx:381-383` Set an `historyError` state and render a MUI `Alert` with a retry button.
- [ ] **F-01-09** — Wrap the root `AIPlayground` return in an `ErrorBoundary` with a retry CTA.
- [ ] **F-01-10** — `AIPlayground.tsx:163-171` Add `AbortController` cleanup to the alias/providers fetch effect.

## Out of scope

- Any refactor to `packages/module-ai` internals (covered by Sprint 05).
- Streaming UI (follow-up after Sprint 02).

## Definition of Done

All 10 findings checked off · typecheck green · lint green · unit tests
green · no new `as any` · no inline `style={{}}` · Business Owner
section written.
