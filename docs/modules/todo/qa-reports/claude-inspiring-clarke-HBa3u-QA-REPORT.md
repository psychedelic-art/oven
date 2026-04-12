# QA Report — `claude/inspiring-clarke-HBa3u` (cycle-9)

Branch sits directly on top of `origin/dev` (`1eb20cf`) — merge-base
identical to dev tip, no rebase required, no drag commits.

## Summary

5 commits, net `+544 / -22` across `packages/module-ai` and
`docs/modules/todo/**`. Lands the final open finding in
`oven-bug-sprint/sprint-05-handler-typesafety.md` (F-05-05) plus the
session-local QA + PROGRESS artefacts from the cycle-8 run.

Commits (oldest to newest):

1. `b54d1d4` — `docs(qa): cycle-8 QA report for claude/inspiring-clarke-JGiXk`
2. `9ac35af` — `merge(session): sync HBa3u with dev after cycle-8 landing`
3. `4559384` — `docs(todo): regenerate PROGRESS + README after cycle-8 landing`
4. `b98d131` — `feat(module-ai): F-05-05 — zod boundary validator for ai-generate-object`
5. `e9e8063` — `docs(todo): mark oven-bug-sprint sprint-05 closed in PROGRESS`

Backup branch: `bk/claude-inspiring-clarke-HBa3u-20260412`.

## F-05-05 change surface

### Source changes

| File | Change |
|---|---|
| `packages/module-ai/src/api/_utils/generate-object-input.ts` | **NEW** — 141 lines. Pure zod-based boundary validator `parseGenerateObjectInput(body)` returning a typed `{ ok, value } \| { ok: false, reason, field }` verdict. JSON-Schema acceptance gate requires at least one of `type \| $ref \| $schema \| properties \| items \| oneOf \| anyOf \| allOf \| enum \| const \| not`. |
| `packages/module-ai/src/api/ai-generate-object.handler.ts` | Drops three hand-rolled `typeof` guards + the `(schema as any)` cast on line 26 in favour of `parseGenerateObjectInput` + `jsonSchema(input.schema)`. Error strings preserved byte-for-byte so existing clients keep their 400 bodies. |
| `packages/module-ai/src/tools/generate-object.ts` | Widens `GenerateObjectParams<T>.schema` from `z.ZodSchema<T>` to `GenerateObjectSchema<T> = z.ZodSchema<T> \| Schema<T>` to match the AI SDK's `generateObject({ schema })` accepted union, allowing the handler to pass the JSON-Schema path without a cast. |

### Tests

| File | Change |
|---|---|
| `packages/module-ai/src/__tests__/generate-object-input.test.ts` | **NEW** — 361 lines, **45 tests** across happy-path, every structural JSON-Schema keyword, non-object / null / undefined / array / primitive bodies, prompt-shape rejection, schema-shape rejection, optional-field type narrowing, and `__proto__` prototype-bypass normalisation. |

### Test run in worktree

```
pnpm --filter @oven/module-ai test
✓ src/__tests__/cost-calculator.test.ts (12)
✓ src/__tests__/provider-sub-client-guard.test.ts (12)
✓ src/__tests__/vector-store-adapter.test.ts (4)
✓ src/__tests__/provider-callable-guard.test.ts (11)
✓ src/__tests__/embed.test.ts (8)
✓ src/__tests__/guardrail-engine.test.ts (10)
✓ src/__tests__/model-resolver.test.ts (10)
✓ src/__tests__/generate.test.ts (11)
✓ src/__tests__/tool-registry.test.ts (9)
✓ src/__tests__/generate-object-input.test.ts (45)    ← NEW
✓ src/__tests__/middleware.test.ts (16)
✓ src/__tests__/provider-registry.test.ts (11)
✓ src/__tests__/usage-tracker.test.ts (11)
✓ src/__tests__/ai-sort-guard.test.ts (8)
✓ src/__tests__/ai-sort-guard-rollout.test.ts (40)

Test Files  15 passed (15)
      Tests  218 passed (218)    ← was 173 on dev
Duration    2.52s
```

### Dashboard tsc baseline

```
pnpm --filter @oven/dashboard exec tsc --noEmit  →  460 errors
```

`dev` baseline is also `460`. **Delta = 0**. Every one of the 460
errors is a pre-existing `TS2307 Cannot find module
'@oven/module-ai/api/...-handler'` path-resolution error rooted in
`packages/workflow-editor/`'s peer-dep `react` resolution and the
`RouteHandler` context typings in `module-subscriptions` /
`module-tenants`. None of them touch the F-05-05 surface.

Grep of remaining `as any` under `packages/module-ai/src/api/`:

```
_utils/generate-object-input.ts:9  — docstring reference to removed cast
_utils/sort.ts:14                  — docstring reference to removed cast
ai-generate-object.handler.ts:16   — docstring reference to removed cast
ai-transcribe.handler.ts:30        — docstring reference to removed cast
ai-tools-all.handler.ts:18         — ACTIVE `(mod as any).chat` — unrelated
                                     to F-05-05; tracked separately on
                                     STATUS and not in scope for sprint-05.
```

Every historical `(schema as any) / (sdkProvider as any) / (sub-client
as any)` under `src/api/**` is gone except the unrelated
`ai-tools-all` entry. Sprint-05 is closed.

## Bugs

None found in the new surface.

## Rule Compliance

| Rules file | Verdict |
|---|---|
| `docs/module-rules.md` | Pass — validator lives under `packages/module-<x>/src/api/_utils/`, uses pure-function boundary validation, returns a tagged verdict, module ships its own zod dependency. |
| `docs/package-composition.md` | Pass — no new package, only a new `_utils` sibling to existing `sort.ts`. |
| `docs/routes.md` | Pass — `POST /api/ai/generate-object` contract unchanged; 400 error messages preserved byte-for-byte. |
| `docs/use-cases.md` | Pass — no functional regression; structured-output use case remains the same. |
| `docs/modules/00-overview.md` | Pass — `module-ai` boundary validation pattern now matches the rest of the module set. |
| `docs/modules/20-module-config.md`, `21-module-subscriptions.md` | N/A — no config schema touched. |
| `docs/modules/13-tenants.md`, `17-auth.md` | N/A — no tenancy / auth boundaries touched. `tenantId` still passes through verbatim. |
| `docs/modules/ai/*.md` | Pass — no spec drift; F-05-05 was the last open sprint-05 finding and is now covered. |
| Root `CLAUDE.md` | Pass — zero `style={{ }}`; zero `clsx`/`classnames` direct imports; `import type` used for `z.ZodSchema` (via `type Schema from 'ai'` + explicit `type { z }`); zustand unchanged; error handling only at handler boundary (`badRequest(verdict.reason)` + `NextResponse.json({ error }, { status: 502 })`), no defensive catches around internal calls. |
| `docs/modules/todo/oven-bug-sprint/sprint-05-handler-typesafety.md` | Pass — row F-05-05 `[ ] → [x]`; STATUS updated to `✅ Done (cycle-8)`. |

## Style Violations

None.

## Test Gaps

None introduced. The new `generate-object-input.test.ts` file covers
every branch of the validator (happy-path + every structural keyword +
every rejection type + prototype bypass). No additional tests required
before merge.

## Recommendation

**MERGE.**

Clean, tightly scoped landing of F-05-05 that closes
`oven-bug-sprint/sprint-05-handler-typesafety` entirely. Tests green at
218/218 (+45 over dev's 173). Dashboard tsc unchanged at 460.
Zero rule-compliance violations. Backup branch in place.
