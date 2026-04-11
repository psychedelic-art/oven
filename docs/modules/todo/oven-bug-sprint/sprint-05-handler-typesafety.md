# Sprint 05 — Handler type safety (sort column + SDK casts)

## Goal

Close the `(table as any)[params.sort]` escape in every AI handler and
add real type guards around SDK responses.

## Scope

> **Triage update (sprint-00)**: F-05-02's "12+ siblings" is actually
> **9** on this branch (see `inventory.md` and Q-T-02). The fix is
> identical — `getOrderColumn` covers all 9 call sites.

Findings to resolve (one commit each):

- [x] **F-05-01** — `packages/module-ai/src/api/ai-playground-executions.handler.ts:13` Replace `(table as any)[params.sort]` with a whitelist lookup. **Done** 2026-04-11 on `claude/inspiring-clarke-0OpL4`: introduced `packages/module-ai/src/api/_utils/sort.ts` (`getOrderColumn`), added `ALLOWED_SORTS` constant to the handler, and added `src/__tests__/ai-sort-guard.test.ts` (8 tests green). 110/110 `@oven/module-ai` tests pass; typecheck delta 0 (stays at the pre-existing 460 workflow-editor baseline).
- [x] **F-05-02** — Extract a shared `getOrderColumn(table, field, allowed)` helper into `packages/module-ai/src/api/_utils/sort.ts` and apply across **all 9** sibling handlers on this branch: `ai-tools.handler.ts`, `ai-guardrails.handler.ts`, `ai-playground-executions.handler.ts`, `ai-usage-logs.handler.ts`, `ai-aliases.handler.ts`, `ai-budgets.handler.ts`, `ai-providers.handler.ts`, `ai-vector-stores.handler.ts`, `ai-budget-alerts.handler.ts`. Per BO IP-4 the helper stays package-private — do NOT export it from `packages/module-ai/src/index.ts`. **Done** 2026-04-11 cycle-5 on `claude/inspiring-clarke-e8QUu`: F-05-01 (cycle-3) covered `ai-playground-executions.handler.ts` (1/9). F-05-02 (cycle-5) rolls `getOrderColumn` + per-handler `ALLOWED_SORTS` constants to the remaining 8 handlers. Each handler now returns `badRequest` on off-allowlist sort fields and prototype-key injection attempts are rejected by `getOrderColumn`'s defence-in-depth null check. New test file `src/__tests__/ai-sort-guard-rollout.test.ts` adds **40 tests** (5 scenarios × 8 handlers): resolves every allowlisted column, rejects off-allowlist fields, rejects `constructor`-prototype injection, rejects SQL-injection strings, rejects empty string. Full `@oven/module-ai` test suite: **150 / 150 green** (was 110). Typecheck delta 0.
- [x] **F-05-03** — `packages/module-ai/src/api/ai-providers-test.handler.ts:53,62,71` Type `sdkProvider` via a proper interface and throw a typed `Error` when it is undefined. **Done** 2026-04-11 cycle-6 Phase 4 on `claude/inspiring-clarke-bYhvx`: added `packages/module-ai/src/engine/provider-types.ts` exporting `AiSdkProvider` interface, `ProviderNotCallableError` typed error, and `assertCallableProvider(value, providerName): asserts value is AiSdkProvider` guard. `ai-providers-test.handler.ts` now calls the guard immediately after `providerRegistry.resolve(...)`, eliminating all three `(sdkProvider as any)(...)` casts (lines 53, 62, 71) and converting the previous "Could not create SDK provider instance" generic JSON into a 502 with the typed error message surfaced by the `catch` branch. New test file `src/__tests__/provider-callable-guard.test.ts` adds **11 tests** covering null/undefined/object/string/number rejection, callable acceptance, AI-SDK-shaped provider acceptance, post-assertion narrowing, error-message debuggability, `instanceof Error`, and immutability. Full `@oven/module-ai` suite: **161/161 green** (was 150). Typecheck delta 0 (dashboard baseline stays at 460). Zero new `as any` anywhere in `packages/module-ai/src/api/`; 3 existing `as any` usages in `ai-transcribe.handler.ts:17`, `ai-generate-object.handler.ts:26`, and `ai-tools-all.handler.ts:18` remain for F-05-04/F-05-05 follow-ups.
- [x] **F-05-04** — `packages/module-ai/src/api/ai-transcribe.handler.ts:17` Add a shape guard on the resolved provider before calling its client. **Done** 2026-04-11 cycle-7 Phase 4 on `claude/inspiring-clarke-LSksg`: extended `packages/module-ai/src/engine/provider-types.ts` with `ProviderSubClientNotCallableError` (typed error carrying `providerName` + `subClientName`) and `resolveSubClientModel(provider, subClientName, modelId, providerName)` helper. `ai-transcribe.handler.ts` now calls `assertCallableProvider(openai, 'openai')` immediately after `providerRegistry.resolve('openai')` and resolves the transcription model through `resolveSubClientModel(..., 'transcription', ...)`, eliminating the `(openai as any)` cast on the previous line 17 and removing the dangerous `.transcription?.(model) ?? openai(model)` fallback — the old fallback called the top-level language-model factory with a Whisper id, which would have returned an LLM instead of a transcription model. The handler `catch` branches on both `ProviderNotCallableError` and `ProviderSubClientNotCallableError` and surfaces each as a 502 with the typed message + `provider` + `latencyMs` fields. New test file `src/__tests__/provider-sub-client-guard.test.ts` adds **12 tests** (happy path, model-id pass-through, image / embedding sub-clients, missing sub-client, non-function sub-client, null sub-client, string sub-client, explicit "no fallback to top-level" assertion, error-message debuggability, `instanceof Error`, end-to-end pipeline composition with `assertCallableProvider`, immutability). Full `@oven/module-ai` suite: **173/173 green** (was 161). Dashboard `tsc --noEmit` baseline stays at 460 (zero delta). Remaining `as any` usage in `packages/module-ai/src/api/`: one in `ai-generate-object.handler.ts:26` for F-05-05.
- [x] **F-05-05** — `packages/module-ai/src/api/ai-generate-object.handler.ts:26` Run the schema through `zod` before passing it to the AI SDK. **Done** 2026-04-11 cycle-8 Phase 4 on `claude/inspiring-clarke-HBa3u`: introduced `packages/module-ai/src/api/_utils/generate-object-input.ts` exporting `parseGenerateObjectInput(body): { ok, value | reason, field }`, the typed `ParsedGenerateObjectInput` shape, and the underlying `generateObjectInputSchema` zod object (re-usable via `.extend(...)` for stricter per-tenant variants). The validator runs the parsed JSON body through a zod object (`prompt: trimmed min(1)`, `schema: record(unknown).refine(structural-keyword)`, `model? string min(1)`, `system? string`, `temperature? finite`, `maxTokens? int positive`, `tenantId? int nonneg`) and produces a typed verdict the handler converts into a `400` (`{ error, field }`) on rejection. The structural-keyword refine accepts a JSON Schema only if it carries at least one of `type | $ref | $schema | properties | items | oneOf | anyOf | allOf | enum | const | not`, which weeds out empty objects and plain key-value dictionaries that the previous `typeof === 'object'` check would have happily forwarded to the AI SDK. The handler reads the typed `input` instead of the raw `body`, so the `costCents` model fallback, the usage-log `requestMetadata.prompt`, and the 502 error envelope all run through the validated values. The underlying `aiGenerateObject` `GenerateObjectParams<T>.schema` parameter is widened from `z.ZodSchema<T>` to a new `GenerateObjectSchema<T> = z.ZodSchema<T> | Schema<T>` union (mirroring the AI SDK's own `generateObject({ schema })` parameter), which lets the handler drop the `(schema as any)` cast on line 26. New test file `src/__tests__/generate-object-input.test.ts` adds **45 tests**: happy path with all optional fields, every JSON Schema structural keyword (`type/object`, `type/array+items`, `type/string`, `type/number`, `type/boolean`, `type/null`, `$ref`, `oneOf`, `anyOf`, `allOf`, `enum`, `const`, `not`), trimming + empty / whitespace prompt rejection, missing / null / string / number / array / empty-object / dictionary schema rejection, invalid optional field rejection (`model`, `temperature`, `maxTokens`, `tenantId`), and a defence-in-depth check that a JS-literal `{ __proto__: { type: 'object' } }` gets normalised by zod into a clean own-property `{ type: 'object' }` schema (zod's `record()` flattens prototype tricks during the for...in copy) without polluting `Object.prototype`, plus a separate test that a JSON-parsed `__proto__` payload with no structural keys IS rejected. Full `@oven/module-ai` suite: **218/218 green** (was 173). Dashboard `tsc --noEmit` baseline stays at 460 (zero delta). Zero `(schema as any)` remaining in `ai-generate-object.handler.ts`. The only `as any` left in `packages/module-ai/src/api/**` is `ai-tools-all.handler.ts:18` (`(mod as any).chat`) — that is a separate finding from a different sprint, not part of F-05-05's scope.

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
