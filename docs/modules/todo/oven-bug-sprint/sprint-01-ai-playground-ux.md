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

- [ ] **F-01-01** — `apps/dashboard/src/components/ai/AIPlayground.tsx:590-593` Replace `as any` on image output URL with an `ImageOutput` type guard.
- [ ] **F-01-02** — `apps/dashboard/src/components/ai/AIPlayground.tsx:774` Type the `generate` response so `tokens.input/output/total` are required.
- [ ] ~~**F-01-03**~~ — struck by sprint-00 triage; already fixed.
- [ ] **F-01-04** — `apps/dashboard/src/components/ai/AIPlayground.tsx:43-64` Wrap `sessionStorage.setItem` in try/catch with in-memory fallback and a user-visible toast when quota is exceeded.
- [ ] ~~**F-01-05**~~ — moved to **F-06-06** (Sprint 06).
- [ ] ~~**F-01-06**~~ — moved to **F-06-07** (Sprint 06).
- [ ] **F-01-07** — `apps/dashboard/src/components/ai/AIPlayground.tsx:812-821` Add `disabled={!model || !prompt || loading}` to the Generate button.
- [ ] **F-01-08** — `apps/dashboard/src/components/ai/AIPlayground.tsx:380-382` Set an `historyError` state and render a MUI `Alert` with a retry button.
- [ ] **F-01-09** — Wrap the root `AIPlayground` return in an `ErrorBoundary` with a retry CTA.
- [ ] **F-01-10** — `apps/dashboard/src/components/ai/AIPlayground.tsx:158-179` Add `AbortController` cleanup to the alias/providers fetch effect (currently uses a `cancelled` flag only).

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

- [ ] All 7 active findings checked `[x]` in this file (F-01-03/05/06
      are struck, not checked).
- [ ] Zero new `as any` introduced anywhere in the diff.
- [ ] Zero inline `style={{}}` introduced.
- [ ] `pnpm -F dashboard typecheck` green.
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [ ] Manual repro documented in the commit body for F-01-07 (unset
      model + click Generate → button stays disabled) and F-01-08
      (force history endpoint to 500 → Alert renders with retry).
- [ ] **Integration Proposals** section authored by the BO role at
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
