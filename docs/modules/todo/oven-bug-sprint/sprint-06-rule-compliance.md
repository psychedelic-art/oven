# Sprint 06 — Cross-cutting rule compliance

## Goal

Bring the AI dashboard pages — and by extension the repo — back into
compliance with the styling and typing rules in `CLAUDE.md`.

## Scope

Findings to resolve (one commit each):

- [ ] **F-06-01** — `apps/dashboard/src/components/ai/GuardrailList.tsx:51,57,63,73` Type every `FunctionField` render prop; no `record: any`.
- [ ] **F-06-02** — `apps/dashboard/src/components/ai/VectorStoreShow.tsx:28,44` Same pattern; define `interface VectorStoreRecord`.
- [ ] **F-06-03** — `apps/dashboard/src/components/ai/VectorStoreList.tsx:43,57,70` Same. If the typed wrapper appears in 3+ components total (counting Sprint 01's `PlaygroundExecution*` fixes), extract it into `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx` per BO IP-5.
- [ ] **F-06-04** — `apps/dashboard/src/components/ai/PlaygroundExecutionList.tsx` Memoize expensive render functions or lift them to module scope so Chip / Box are not recreated each parent render.
- [ ] **F-06-05** — Repo-wide sweep: grep for `^import \{[^}]*\}` imports where every symbol is only used as a type and convert to `import type`. Start with `packages/module-ai`, `packages/module-agent-core`, `packages/module-chat`, `apps/dashboard/src/components/ai`.

## Out of scope

- Portal app cleanup.
- Editor packages (`ui-flows-editor`, `form-editor`, `map-editor`) —
  they get their own sprint.
- Any behavioral change. This sprint is **pure compliance**.
- Any change outside `apps/dashboard/src/components/ai/**` and the
  packages listed for the F-06-05 sweep.

## Deliverables

- 5 commits, one per finding.
- (Conditional) `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx`
  if and only if the 3+-occurrence threshold is met.
- A list in the commit body of F-06-05 of every file converted
  from value-import to type-only-import, so the BO can review the
  blast radius.

## Acceptance criteria

- [ ] All 5 findings checked `[x]` in this file.
- [ ] Zero new `as any` introduced by this sprint.
- [ ] Zero inline `style={{}}` introduced.
- [ ] Zero direct `clsx` or `classnames` imports introduced.
- [ ] `pnpm -F dashboard lint typecheck` green.
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [ ] **Integration Proposals** section authored by the BO role at
      the bottom of this file before the sprint closes.

## Touched packages

- `apps/dashboard` (only under `src/components/ai/`).
- `packages/module-ai`, `packages/module-agent-core`,
  `packages/module-chat` (F-06-05 sweep only; type-import conversion
  is behavior-neutral).

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
