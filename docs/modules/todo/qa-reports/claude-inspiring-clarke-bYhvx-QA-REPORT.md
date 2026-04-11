# QA Report — `claude/inspiring-clarke-bYhvx`

**Audit date:** 2026-04-11
**Session branch:** `claude/inspiring-clarke-LSksg`
**Backup branch:** `bk/claude-inspiring-clarke-bYhvx-20260411`
**Merge base vs `origin/dev`:** `80a58ac` (current `dev` HEAD; no rebase required)
**Ahead of dev:** 3 commits
**Behind dev:** 0

## Branch relationship

The branch is a clean linear extension of `origin/dev` (cycle-6 merge
`80a58ac`). It adds exactly three commits:

| # | SHA | Kind | Subject |
|---|-----|------|---------|
| 1 | `f90829b` | docs | `docs(todo): regenerate PROGRESS + README fresh after cycle-6 landing on dev` |
| 2 | `7a22b4f` | feat + test | `feat(module-ai): F-05-03 — typed SDK provider guard + ProviderNotCallableError` |
| 3 | `3d3bf88` | docs | `docs(oven-bug-sprint): mark F-05-03 done in sprint-05 + STATUS` |

No shared unmerged ancestors with any other candidate branch. The
only other candidate (`claude/qa-test-todo-module-K2tpT`) carries a
single generated `tsbuildinfo` artifact and remains blocked.

## Summary

One finding from `oven-bug-sprint/sprint-05-handler-typesafety` —
**F-05-03** — is shipped: `ai-providers-test.handler.ts` is no longer
typed with three `(sdkProvider as any)(...)` escape hatches. The
branch introduces a small, package-private type module
`packages/module-ai/src/engine/provider-types.ts` exporting:

- `AiSdkProvider` — callable interface plus optional sub-client map.
- `ProviderNotCallableError` — typed error carrying `providerName`.
- `assertCallableProvider(value, providerName): asserts value is AiSdkProvider`.

The guard runs immediately after `providerRegistry.resolve()` in
`ai-providers-test.handler.ts`, and the handler's `catch` branch
converts `ProviderNotCallableError` into a `502` with the typed
message. Generic catch behaviour is preserved for SDK / network
failures.

### Files changed

| Path | Change | Notes |
|---|---|---|
| `packages/module-ai/src/engine/provider-types.ts` | **new** | 68 lines. `AiSdkProvider`, `ProviderNotCallableError`, `assertCallableProvider`. |
| `packages/module-ai/src/api/ai-providers-test.handler.ts` | **refactor** | Three `(sdkProvider as any)(...)` casts (previously lines 53, 62, 71) removed; one assertion call added after `.resolve()`; handler `catch` branches on `instanceof ProviderNotCallableError` for a 502 response. |
| `packages/module-ai/src/__tests__/provider-callable-guard.test.ts` | **new** | 11 vitest tests (full shape-guard matrix + narrowing + immutability). |
| `docs/modules/todo/PROGRESS.md` | **regen** | Fresh regeneration after `80a58ac` cycle-6 landing. |
| `docs/modules/todo/README.md` | **update** | Cycle-6 landing note. |
| `docs/modules/todo/qa-reports/claude-inspiring-clarke-e8QUu-QA-REPORT.md` | **new** | Archived cycle-6 QA report. |
| `docs/modules/todo/oven-bug-sprint/STATUS.md` | **tick** | Sprint-05 progress row updated. |
| `docs/modules/todo/oven-bug-sprint/sprint-05-handler-typesafety.md` | **tick** | F-05-03 moves `[ ] → [x]` with full provenance. |

## Test results

```
pnpm -F @oven/module-ai test
  13 files, 161 tests, all green
  (was 150 prior to F-05-03 — +11 new in provider-callable-guard.test.ts)
```

Vitest suite breakdown confirmed:

- `provider-callable-guard.test.ts`     11 tests
- `ai-sort-guard-rollout.test.ts`       40 tests
- `ai-sort-guard.test.ts`                8 tests
- `middleware.test.ts`                  16 tests
- `cost-calculator.test.ts`             12 tests
- `generate.test.ts`                    11 tests
- `provider-registry.test.ts`           11 tests
- `usage-tracker.test.ts`               11 tests
- `model-resolver.test.ts`              10 tests
- `guardrail-engine.test.ts`            10 tests
- `tool-registry.test.ts`                9 tests
- `embed.test.ts`                        8 tests
- `vector-store-adapter.test.ts`         4 tests
- **Total: 161/161 green**

## Typecheck

```
pnpm -F @oven/dashboard exec tsc --noEmit
  460 errors
```

**Baseline unchanged** (`workflow-editor` peer-dep React resolution +
`RouteHandler` context-param issues in `module-subscriptions` /
`module-tenants`). Delta introduced by this branch: **0**.

## Senior code review

### `provider-types.ts`

- Callable `AiSdkProvider` interface is the minimal shape the handler
  needs; `readonly [key: string]: unknown` leaves room for sub-clients
  without widening to `any`. Good.
- `ProviderNotCallableError` extends `Error`, sets `.name`, and stores
  `providerName` on the instance for downstream reporting. Good.
- `assertCallableProvider` is a `asserts value is AiSdkProvider`
  type-guard so TypeScript narrows at the call site without a cast.
- Two-arm null/undefined vs `typeof !== 'function'` split is
  marginally wordier than a single check but gives a cleaner error
  surface. Acceptable.
- No inline styles; not a React component. Pure `.ts` module. Type
  imports not required (no type-only imports).

### `ai-providers-test.handler.ts`

- Imports `assertCallableProvider` and `ProviderNotCallableError` as
  **values** — required because both are used at runtime (the guard
  is called and the error is `instanceof`-checked). Correct: `import type`
  would break runtime.
- Single-line assertion replaces three separate `as any` casts; all
  subsequent `sdkProvider(...)` calls narrow cleanly.
- Error handling lives at the HTTP boundary (CLAUDE.md rule).
- OWASP: no change to input handling, still routes via `[id]`
  params with `parseInt`, still fetches by `eq(aiProviders.id, ...)`,
  still guards the `apiKeyEncrypted` presence. No new surface.
- Tenancy: unchanged — this handler reads a single provider by id
  and is exercised through the admin provider-test flow.

### `provider-callable-guard.test.ts`

- 11 tests, vitest-native, matches the framework already used by the
  surrounding package (no new infra invented).
- Uses inline `type AiSdkProvider` import — correct, CLAUDE.md-compliant.
- Exercises null/undefined/object/string/number rejection, plain
  function acceptance, AI-SDK-shaped callable acceptance, post-assertion
  narrowing, embedded provider name in error, `instanceof Error`,
  and immutability.
- No mocks, no flaky timing; pure unit tests.

## Rule compliance

| Ground-truth file | Verdict | Note |
|---|---|---|
| `docs/module-rules.md` | **pass** | Handler still conforms to HTTP boundary error handling, single-tenancy read pattern, and the admin-only provider-test surface. |
| `docs/package-composition.md` | **pass** | `provider-types.ts` stays under `packages/module-ai/src/engine/`; no cross-package import; no new public export from `packages/module-ai/src/index.ts`. |
| `docs/routes.md` | **pass** | `POST /api/ai-providers/[id]/test` unchanged. |
| `docs/use-cases.md` | **pass** | Provider-test use case unchanged. |
| `docs/modules/00-overview.md` | **pass** | Module topology unchanged. |
| `docs/modules/20-module-config.md` + `21-module-subscriptions.md` | **pass** | No config surface touched. |
| `docs/modules/13-tenants.md` + `17-auth.md` | **pass** | No tenancy or auth changes. |
| `docs/modules/ai/` canonical shape | **pass** | No spec drift; module doc set unchanged. |
| Root `CLAUDE.md` | **pass** | No inline styles; no MUI/Tailwind in a handler file. `import type` used inline for type-only in the test. Error handling at system boundary only. No `as any`. |
| `oven-bug-sprint/sprint-05-handler-typesafety.md` | **pass** | Sprint file acceptance row `[ ] → [x]` with provenance. |

## Style violations

None.

## Test gaps

None introduced; F-05-03 closes the provider-callable gap with 11
new regression tests.

## Recommendation

**MERGE.** Clean diff, full provenance, 11 new tests green, typecheck
delta zero, sprint file ticked. Low blast radius (one engine helper +
one handler refactor + one test file).

## Backup

Pushing `bk/claude-inspiring-clarke-bYhvx-20260411` before any merge
is attempted, so the original session branch tip `3d3bf88` remains
recoverable even if the feature branch is later deleted.

## Merge plan

```
git checkout dev
git pull --ff-only origin dev
git merge --no-ff origin/claude/inspiring-clarke-bYhvx \
  -m "merge(cycle-7): land module-ai F-05-03 typed SDK provider guard (+11 tests)"
git push origin dev
```

Gate: one `AskUserQuestion` approval before `git merge`.
