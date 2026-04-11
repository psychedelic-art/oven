# QA Report — `claude/inspiring-clarke-LSksg`

**Audit date:** 2026-04-11
**Cycle:** cycle-7
**Session branch:** `claude/inspiring-clarke-JGiXk`
**Backup branch:** `bk/claude-inspiring-clarke-LSksg-20260411`
**Tip commit:** `04f47e7 docs(todo): refresh PROGRESS after F-05-04 ship (cycle-7 Phase 4)`
**Merge base vs `origin/dev`:** `80a58ac` (current `dev` HEAD, cycle-6 landing)
**Ahead of dev:** 10 commits
**Behind dev:** 0

## Branch relationship

LSksg is a strict linear superset of `claude/inspiring-clarke-bYhvx`
(F-05-03 only). The bYhvx tip commit `3d3bf88` is reachable from
LSksg via the intra-session `--no-ff` merge `bfb944e` ("cycle-7 land
F-05-03"). `git rev-list --count LSksg..bYhvx = 0` confirms the
subset relationship. Landing LSksg therefore lands bYhvx at once —
no separate gate is required.

Shared unmerged ancestors across the candidate set
(`LSksg`, `bYhvx`, `qa-test-todo-module-K2tpT`):

- `7a22b4f`, `3d3bf88`, `f90829b` appear in both LSksg and bYhvx
  (by construction — they are bYhvx's original commits). No other
  shared ancestors exist that require landing first.

`claude/qa-test-todo-module-K2tpT` (1 ahead, 29 behind) carries a
single commit `1ffa9c1` that only refreshes
`apps/dashboard/tsconfig.tsbuildinfo`. This is a generated build
artifact; it was already explicitly blocked in cycles 4, 5, and 6.
Verdict unchanged: **BLOCK**.

## Summary

Cycle-7 ships two more findings from `oven-bug-sprint/sprint-05-handler-typesafety`:

- **F-05-03** (`packages/module-ai/src/api/ai-providers-test.handler.ts`):
  replaces three `(sdkProvider as any)(...)` casts with a single
  `assertCallableProvider` shape guard. New
  `packages/module-ai/src/engine/provider-types.ts` introduces
  `AiSdkProvider`, `ProviderNotCallableError`, and the asserts-guard
  itself. Typed errors surface as HTTP 502 with `provider` +
  `latencyMs` fields.

- **F-05-04** (`packages/module-ai/src/api/ai-transcribe.handler.ts`):
  replaces `(openai as any).transcription?.(model) ?? (openai as any)(model)`
  with `assertCallableProvider` + `resolveSubClientModel('transcription',
  ...)`. Critical behavioural change: the sub-client helper does NOT
  fall back to the top-level language-model factory when
  `.transcription` is missing — that fallback would silently return
  an LLM model where the handler expects a speech-to-text model,
  and the downstream AI SDK `experimental_transcribe` call would
  fail at runtime with a cryptic error. The helper surfaces a typed
  `ProviderSubClientNotCallableError` → HTTP 502 instead.

### Files touched

| File | Kind | Lines |
|---|---|---|
| `packages/module-ai/src/engine/provider-types.ts` | new | 128 |
| `packages/module-ai/src/api/ai-providers-test.handler.ts` | refactor | ~25 net |
| `packages/module-ai/src/api/ai-transcribe.handler.ts` | refactor | ~30 net |
| `packages/module-ai/src/__tests__/provider-callable-guard.test.ts` | new | 90 (11 tests) |
| `packages/module-ai/src/__tests__/provider-sub-client-guard.test.ts` | new | 147 (12 tests) |
| `docs/modules/todo/oven-bug-sprint/sprint-05-handler-typesafety.md` | docs | F-05-03 + F-05-04 rows [x] |
| `docs/modules/todo/oven-bug-sprint/STATUS.md` | docs | sprint-05 row bump |
| `docs/modules/todo/PROGRESS.md` | docs | cycle-7 audit |
| `docs/modules/todo/README.md` | docs | cycle-7 snapshot |
| `docs/modules/todo/qa-reports/claude-inspiring-clarke-bYhvx-QA-REPORT.md` | new | QA for F-05-03 subset |
| `docs/modules/todo/qa-reports/claude-inspiring-clarke-e8QUu-QA-REPORT.md` | docs | cycle-6 archive |

## Tests

```
pnpm -F @oven/module-ai test
```

**Result: 173/173 green across 14 test files** (was 150 on dev; +23
from F-05-03 + F-05-04).

```
✓ provider-callable-guard.test.ts   (11 tests)   F-05-03
✓ provider-sub-client-guard.test.ts (12 tests)   F-05-04
✓ ai-sort-guard.test.ts             (8 tests)
✓ ai-sort-guard-rollout.test.ts     (40 tests)
✓ cost-calculator.test.ts           (12 tests)
✓ embed.test.ts                     (8 tests)
✓ generate.test.ts                  (11 tests)
✓ guardrail-engine.test.ts          (10 tests)
✓ middleware.test.ts                (16 tests)
✓ model-resolver.test.ts            (10 tests)
✓ provider-registry.test.ts         (11 tests)
✓ tool-registry.test.ts             (9 tests)
✓ usage-tracker.test.ts             (11 tests)
✓ vector-store-adapter.test.ts      (4 tests)
Test Files  14 passed (14)
     Tests  173 passed (173)
```

Independently reproduced in-worktree at
`/home/user/wt-LSksg` after `pnpm install`.

### Coverage of the guard invariants

F-05-03 (`assertCallableProvider`): null/undefined/object/string/number
rejection, plain-function acceptance, AI-SDK-shaped acceptance, post-
assertion type narrowing, error-message debuggability, `instanceof
Error`, immutability of the narrowed value.

F-05-04 (`resolveSubClientModel`): happy path, model id pass-through,
image + embedding sub-clients, missing sub-client, non-function
sub-client (object, null, string), **explicit no-fallback-to-top-level
assertion** (verifies the old code path is killed), error-message
debuggability (`providerName` + `subClientName` embedded), `instanceof
Error`, end-to-end composition with `assertCallableProvider`,
provider-object immutability.

## Typecheck delta

```
pnpm -F @oven/dashboard exec tsc --noEmit   (from /home/user/wt-LSksg)
```

**460 errors** — identical to the `origin/dev` baseline at `80a58ac`.
All 460 errors live in `packages/workflow-editor/**` (peer-dep
`react` not resolved — pre-existing, tracked in PROGRESS known-issue
#1) and a handful of `RouteHandler` context-param typings in
`module-subscriptions` / `module-tenants` (also pre-existing).

**Zero regressions.** `module-ai` itself has no emitted tsc errors.

## Rule Compliance

| Ground-truth file | Status | Notes |
|---|---|---|
| `docs/module-rules.md` | PASS | New helpers live in the owning module; no cross-package leakage; types exported via the module's existing path conventions. |
| `docs/package-composition.md` | PASS | No new packages. `module-ai` already depends on `module-registry`, `module-subscriptions`, `module-files` — unchanged. |
| `docs/routes.md` | PASS | No route changes. Same endpoints (`POST /api/ai-providers/[id]/test`, `POST /api/ai/transcribe`) with hardened error shape. |
| `docs/use-cases.md` | PASS | Transcription + provider-test flows unchanged from the user's POV; error shape is now self-diagnosing. |
| `docs/modules/00-overview.md` | PASS | No module inventory changes. |
| `docs/modules/20-module-config.md` | PASS | No config surface changes. |
| `docs/modules/21-module-subscriptions.md` | PASS | No subscriptions changes. |
| `docs/modules/13-tenants.md` | PASS | No tenants changes. |
| `docs/modules/17-auth.md` | PASS | No auth changes. |
| `docs/modules/ai/*` (canonical set) | PASS | No doc drift required — the helper is an implementation detail of the provider registry, and the sprint-05 doc records it. |
| Root `CLAUDE.md` | PASS | Type-only imports used (`import type { AiSdkProvider }`); no `style={}` (non-UI); no zustand; boundary-only error handling (the handler catch block is the boundary). |
| `oven-bug-sprint/sprint-05-handler-typesafety.md` | PASS | F-05-03 + F-05-04 rows now `[x]` with full provenance on LSksg. F-05-05 remains open. |

## Style Violations

None. Files touched are server-side handlers and pure TS; no JSX, no
MUI, no Tailwind, no zustand. All imports follow `import type` for
type-only symbols (verified in handler + test files).

## Security Review (OWASP top 10 + tenancy)

- **Injection:** No new SQL, no string interpolation of user input
  into queries. `providerSlug` is a server constant (`'openai'`) in
  the transcribe handler; in the providers-test handler it comes
  from `aiProviders.slug` already constrained at insert time.
- **Broken access control:** Endpoints unchanged. Tenancy scoping is
  still enforced upstream (`provider.id` → DB lookup).
- **Sensitive data exposure:** Error messages embed provider slug and
  sub-client name — both operator-controlled labels, not user data
  or keys. The handler explicitly does NOT re-throw the underlying
  SDK error, which could leak stack traces.
- **Insecure error handling:** Typed errors surface as HTTP 502 with
  a bounded shape `{ error, provider, latencyMs }`. The generic
  catch branch is preserved for SDK/network errors and returns the
  same shape.
- **Logging injection:** `[ai-transcribe] Usage logging failed:` uses
  `err instanceof Error ? err.message : err` — bounded, no
  format-string expansion.

## Test Gaps

None identified for the shipped changes. The unit-test matrix covers
every guard failure mode, the critical no-fallback invariant, and
end-to-end composition. The remaining sprint-05 finding F-05-05
(`ai-generate-object.handler.ts` zod schema) is out of scope for
this branch.

## Recommendation

**MERGE** LSksg into `dev` via `--no-ff` with the merge-commit
message:

> `merge(cycle-7): land module-ai F-05-03 + F-05-04 typed SDK guards (+23 tests)`

This single landing carries bYhvx's F-05-03 work as well; no
separate merge is required for bYhvx.

After landing, regenerate `docs/modules/todo/PROGRESS.md` and
`docs/modules/todo/README.md` fresh on session branch
`claude/inspiring-clarke-JGiXk`, and proceed to Phase 3 module
selection.
