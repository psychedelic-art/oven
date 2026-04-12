# Sprint 06 — Cross-cutting rule compliance

## Goal

Bring the AI dashboard pages — and by extension the repo — back into
compliance with the styling and typing rules in `CLAUDE.md`.

## Scope

> **Triage update (sprint-00)**: Sprint now carries 7 findings (was 5).
> F-06-06 and F-06-07 migrated in from Sprint 01 because they share
> the exact `record: any` pattern. F-06-03 scope shrank — only 1
> `record: any` call-site remains on this branch (not 3).

Findings to resolve:

- [x] **F-06-01** — `apps/dashboard/src/components/ai/GuardrailList.tsx:51,57,63,73` Type every `FunctionField` render prop; no `record: any`. **Done cycle-9 Phase 4**: extracted `packages/module-ai/src/view/guardrail-record.ts` (`GuardrailRecord` interface + `GUARDRAIL_ACTION_COLORS` + `resolveGuardrailActionColor` + `truncateGuardrailPattern` pure helpers, own-property guard against prototype lookups), updated the four `FunctionField` call sites to `<FunctionField<GuardrailRecord>>`, added **26 vitest regression tests** (`@oven/module-ai` 218 → 244). Zero `record: any`, zero inline style, zero behavioural change in the rendered output.
- [ ] **F-06-02** — `apps/dashboard/src/components/ai/VectorStoreShow.tsx:28,44` Same pattern; define `interface VectorStoreRecord`.
- [ ] **F-06-03** — `apps/dashboard/src/components/ai/VectorStoreList.tsx:43` Same (only one call site on this branch, triage-verified).
- [ ] **F-06-04** — `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` Memoize expensive render functions or lift them to module scope so Chip / Box are not recreated each parent render.
- [ ] **F-06-05** — Repo-wide sweep: grep for `^import \{[^}]*\}` imports where every symbol is only used as a type and convert to `import type`. Start with `packages/module-ai` and `apps/dashboard/src/components/ai`. (`packages/module-chat` and `packages/module-agent-core` do **not** exist on `claude/eager-curie-0da9Q` — drop them from the sweep per sprint-00 triage.)
- [ ] **F-06-06** — `apps/dashboard/src/components/ai/PlaygroundExecutionShow.tsx:24,31,41,50,72,124` — 6 `record: any` casts. Define `interface PlaygroundExecutionRecord` and use it consistently. *(Inherited from Sprint 01 F-01-05.)*
- [ ] **F-06-07** — `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx:60,71,81` — 3 `record: any` casts in this list view. Type them against the same `PlaygroundExecutionRecord`. *(Inherited from Sprint 01 F-01-06.)*

With 6 total `record: any` call sites across `PlaygroundExecutionShow`
(F-06-06) and `PlaygroundExecutionList` (F-06-07) plus the 4 in
`GuardrailList` (F-06-01), the BO IP-5 three-site threshold is met.
**Extract `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx`**
in this sprint.

## Out of scope

- Portal app cleanup.
- Editor packages (`ui-flows-editor`, `form-editor`, `map-editor`) —
  they get their own sprint.
- Any behavioral change. This sprint is **pure compliance**.
- Any change outside `apps/dashboard/src/components/ai/**` and the
  packages listed for the F-06-05 sweep.

## Deliverables

- 7 commits, one per finding.
- `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx`
  (BO IP-5 threshold met after the triage-driven merge of F-06-06/07).
- A list in the commit body of F-06-05 of every file converted
  from value-import to type-only-import, so the BO can review the
  blast radius.

## Acceptance criteria

- [ ] All 7 findings checked `[x]` in this file.
- [ ] Zero new `as any` introduced by this sprint.
- [ ] Zero inline `style={{}}` introduced.
- [ ] Zero direct `clsx` or `classnames` imports introduced.
- [ ] `pnpm -F dashboard lint typecheck` green.
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [ ] **Integration Proposals** section authored by the BO role at
      the bottom of this file before the sprint closes.

## Touched packages

- `apps/dashboard` (only under `src/components/ai/`).
- `packages/module-ai` (F-06-05 sweep only; type-import conversion is
  behavior-neutral). `module-chat` and `module-agent-core` are absent
  on this branch — dropped per sprint-00 triage.

## Risks

- **R1**: Converting a value import to `import type` may break code
  that uses the symbol as both a value and a type. *Mitigation*:
  before conversion, grep the file for non-type usages of the
  imported symbol. If any exist, skip that symbol.
- **R2**: Extracting `TypedFunctionField` too early creates a weak
  abstraction. *Mitigation*: follow BO IP-5 strictly — three or more
  occurrences is the minimum, counting Sprint 01's fixes.

## Rule references

- `CLAUDE.md` — all of `no-inline-styles`, `mui-sx-prop`,
  `tailwind-cn-utility`, `type-imports`.
- `docs/module-rules.md` Rule 4 (Loose Coupling) — do not introduce
  a new shared component in a place that becomes a cross-module
  dependency.
