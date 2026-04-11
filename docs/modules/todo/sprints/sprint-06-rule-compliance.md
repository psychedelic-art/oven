# Sprint 06 — Cross-cutting rule compliance

**Sprint ID**: `sprint-06`
**Branch**: `feature/bugs`
**Owner package(s)**: `apps/dashboard`, repo-wide
**Related docs**: [`CLAUDE.md`](../../../../CLAUDE.md)

## Goal

Bring the AI dashboard pages — and by extension the repo — back into
compliance with the styling and typing rules in `CLAUDE.md`.

## Integration Proposals

_To be authored by the Business Owner role after implementation._

## Findings

- [ ] **F-06-01** — `GuardrailList.tsx:51,57,63,73` Type every `FunctionField` render prop; no `record: any`.
- [ ] **F-06-02** — `VectorStoreShow.tsx:28,44` Same pattern; define `interface VectorStoreRecord`.
- [ ] **F-06-03** — `VectorStoreList.tsx:43,57,70` Same. If the same typed wrapper appears in 3+ components, extract it into `apps/dashboard/src/components/ai/_fields/TypedFunctionField.tsx`.
- [ ] **F-06-04** — `PlaygroundExecutionList.tsx` Memoize expensive render functions or lift them to module scope.
- [ ] **F-06-05** — Repo-wide sweep: grep for `^import \{[^}]*\}` imports where every symbol is only used as a type and convert to `import type`. Start with `packages/module-ai`, `packages/module-agent-core`, `packages/module-chat`, `apps/dashboard/src/components/ai`.

## Context for the fixer

- `CLAUDE.md` forbids: inline `style={{}}`, `clsx` direct imports,
  template-literal className, value imports used only as types.
- Use `cn()` from `@oven/oven-ui` for any Tailwind composition
  touched during this sweep.
- Do NOT change behavior — this sprint is pure compliance.

## Out of scope

- Portal app cleanup.
- Editor packages (`ui-flows-editor`, `form-editor`, etc.) — those
  get their own sprint.

## Definition of Done

All 5 findings checked off · zero new `as any` introduced · typecheck
and lint green for all touched packages.
