# Sprint 01 — AI Playground UX & type safety

## Goal

Stabilize the AI Playground UI. Eliminate `as any` casts, add an error
boundary, fix the Generate button disabled state, and surface
history-load failures to the user.

## Scope

Findings to resolve (one commit each):

- [ ] **F-01-01** — `apps/dashboard/src/components/ai/AIPlayground.tsx:591` Replace `as any` on image output URL with an `ImageOutput` type guard.
- [ ] **F-01-02** — `apps/dashboard/src/components/ai/AIPlayground.tsx:775` Type the `generate` response so `tokens.input/output/total` are required.
- [ ] **F-01-03** — `apps/dashboard/src/components/ai/AIPlayground.tsx:1220-1227` Exit early after `setError('Invalid JSON schema')`; never pass undefined to the downstream call.
- [ ] **F-01-04** — `apps/dashboard/src/components/ai/AIPlayground.tsx:49-62` Wrap `sessionStorage.setItem` in try/catch with in-memory fallback.
- [ ] **F-01-05** — `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx:24` Type the `record` prop as `PlaygroundExecution`.
- [ ] **F-01-06** — `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx:60,71` Same. Only extract a typed `FunctionField` wrapper if a third call site appears (see BO IP-5).
- [ ] **F-01-07** — `apps/dashboard/src/components/ai/AIPlayground.tsx:812-821` Add `disabled={!model || loading}` to the Generate button.
- [ ] **F-01-08** — `apps/dashboard/src/components/ai/AIPlayground.tsx:381-383` Set an `historyError` state and render a MUI `Alert` with a retry button.
- [ ] **F-01-09** — Wrap the root `AIPlayground` return in an `ErrorBoundary` with a retry CTA.
- [ ] **F-01-10** — `apps/dashboard/src/components/ai/AIPlayground.tsx:163-171` Add `AbortController` cleanup to the alias/providers fetch effect.

## Out of scope

- Any refactor to `packages/module-ai` internals (covered by Sprint 05).
- Streaming UI (deferred to after Sprint 02).
- Changes to `PlaygroundExecution*` list components beyond the cited
  `record: any` casts (broader rule-compliance sweep lives in Sprint 06).

## Deliverables

- 10 commits, one per finding, on `feature/bugs`.
- A new `ErrorBoundary` component, co-located under
  `apps/dashboard/src/components/ai/` if it does not already exist.
- A typed `PlaygroundExecution` interface (placed next to its usages
  — do not export from `module-ai` unless needed externally).

## Acceptance criteria

- [ ] All 10 findings checked `[x]` in this file.
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
