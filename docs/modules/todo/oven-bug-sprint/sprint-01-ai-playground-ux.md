# Sprint 01 — AI Playground UX & type safety

## Goal

Stabilize the AI Playground UI. Eliminate `as any` casts, add an error
boundary, fix the Generate button disabled state, and surface
history-load failures to the user.

## Scope

> **Triage update (sprint-00)**: F-01-03 struck — already fixed on
> `HEAD` (`468ea41`); the `catch` block already returns early.
> F-01-05 and F-01-06 moved to Sprint 06 as F-06-06 / F-06-07 (they
> belong to the cross-cutting `record: any` sweep).

Findings to resolve (one commit each):

- [x] **F-01-01** — Replaced `(item.output as any)?.url` with `isImageOutput()` type guard. Done cycle-14.
- [x] **F-01-02** — Replaced `output.tokens as any` with `hasTokens()` type guard. Done cycle-14.
- [x] ~~**F-01-03**~~ — struck by sprint-00 triage; already fixed.
- [x] **F-01-04** — Added `sessionStorageWarned` flag + `console.warn` on quota exceeded. In-memory fallback was already present via React state. Done cycle-14.
- [x] ~~**F-01-05**~~ — moved to **F-06-06** (Sprint 06). Done cycle-11.
- [x] ~~**F-01-06**~~ — moved to **F-06-07** (Sprint 06). Done cycle-11.
- [x] **F-01-07** — Changed `disabled={loading || !prompt}` to `disabled={!model || !prompt || loading}` across all 4 Generate buttons. Done cycle-14.
- [x] **F-01-08** — Added `historyError` state to `useHistory()`. Renders MUI Alert with Retry button in HistorySidebar across all 7 tabs. Done cycle-14.
- [x] **F-01-09** — Created `PlaygroundErrorBoundary` component. Wraps root AIPlayground return. `console.error` + retry CTA. Done cycle-14.
- [x] **F-01-10** — Replaced `cancelled` boolean with `AbortController` in `useAliasesAndProviders()`. Signal passed to both fetch calls. `AbortError` caught + silenced. Done cycle-14.

## Out of scope

- Any refactor to `packages/module-ai` internals (covered by Sprint 05).
- Streaming UI (deferred to after Sprint 02).
- Changes to `PlaygroundExecution*` list components beyond the cited
  `record: any` casts (broader rule-compliance sweep lives in Sprint 06).

## Deliverables

- 7 commits, one per active finding, on `feature/bugs`.
- A new `ErrorBoundary` component, co-located under
  `apps/dashboard/src/components/ai/` if it does not already exist.
- A typed `PlaygroundExecution` interface (placed next to its usages
  — do not export from `module-ai` unless needed externally).

## Acceptance criteria

- [x] All 7 active findings checked `[x]` in this file (F-01-03/05/06
      are struck, not checked).
- [x] Zero new `as any` introduced anywhere in the diff.
- [x] Zero inline `style={{}}` introduced.
- [ ] `pnpm -F dashboard typecheck` green (pre-existing 465 TS2307 errors unchanged).
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [x] Manual repro documented in the commit body for F-01-07 (unset
      model + click Generate -> button stays disabled) and F-01-08
      (force history endpoint to 500 -> Alert renders with retry).
- [x] **Integration Proposals** section authored by the BO role at
      the bottom of this file before the sprint closes.

## Touched packages

- `apps/dashboard` (only files under `src/components/ai/`).

## Risks

- **R1**: Wrapping `AIPlayground` in an `ErrorBoundary` may swallow
  errors that previously surfaced in dev. *Mitigation*: the boundary
  must `console.error` in development and call an error-reporting
  hook in production.
- **R2**: `AbortController` cleanup can leak into unrelated effects
  if the wrong dependency array is used. *Mitigation*: scope the
  controller to the exact effect that issues the fetch, and add a
  unit test that asserts `abort()` is called on unmount if the
  playground testing utilities allow.

## Rule references

- `CLAUDE.md` — `no-inline-styles`, `mui-sx-prop`, `type-imports`.
- `docs/module-rules.md` Rule 4 (Loose Coupling) — do not reach into
  `module-ai` internals to fix a dashboard-side type problem.

## Integration Proposals (BO role)

### IP-1: Extract shared type guards to module-ai/view

`isImageOutput()` and `hasTokens()` are defined inside AIPlayground.tsx.
If PlaygroundExecutionShow or other views need the same guards, move
them to `packages/module-ai/src/view/playground-execution-record.ts`
alongside the existing record interface.

### IP-2: Shared ErrorBoundary

`PlaygroundErrorBoundary` is specific to the AI Playground. If other
complex dashboard pages (workflow editor, map editor) need the same
pattern, extract a generic `DashboardErrorBoundary` to a shared
location. Not justified at 1 occurrence today.

### IP-3: AbortController utility hook

The `useAliasesAndProviders` effect manually wires `AbortController`.
If more effects adopt this pattern, consider a `useFetchWithAbort()`
hook. Premature at 1 usage today.
