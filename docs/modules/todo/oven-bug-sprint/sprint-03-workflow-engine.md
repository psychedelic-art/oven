# Sprint 03 — Workflow engine correctness

## Goal

Harden the workflow engine: stop emitting phantom versions, stabilize
infinite-loop detection, and return real HTTP errors instead of
swallowing malformed payloads.

## Scope

> **Triage update (sprint-00)**: path shifts recorded below; no
> findings dropped. F-03-02 lives in `src/engine.ts`, not
> `src/engine/engine.ts`. F-03-04 line is `57`, not `43`, on this
> branch.

Findings to resolve (one commit each):

- [x] **F-03-01** — `packages/module-workflows/src/api/workflows-by-id.handler.ts:47` Use a canonicalized structural compare (sort keys, strip insignificant whitespace) before bumping the version. Extract the helper into `packages/module-workflows/src/canonicalize.ts`. **Done**: `structurallyEqual()` replaces raw `JSON.stringify` comparison. 13 regression tests in `canonicalize.test.ts`.
- [x] **F-03-02** — `packages/module-workflows/src/engine.ts:237` Replace `JSON.stringify(machineContext)` with a `Set<stateId>` visited set (see BO IP-7). *(Path corrected by triage.)* **Done**: `visitedTransitions` Set tracks `previousState->currentState` pairs. 1 regression test in `engine-loop-detection.test.ts`.
- [x] **F-03-03** — `packages/module-workflows/src/api/workflows-execute.handler.ts:18-23` Distinguish empty body (`""`) from parse error. Return `400 Invalid JSON` on failure, empty object on empty body only. **Done**: reads `request.text()` first, parses only if non-empty. 5 regression tests in `workflows-execute-handler.test.ts`.
- [x] **F-03-04** — `packages/module-config/src/api/module-configs.handler.ts:57` Wrap `await request.json()` in a try/catch that returns `400 Invalid JSON`. *(Line shifted from 43.)* **Done**: try/catch around `request.json()` in POST handler.

## Out of scope

- Editor UI bugs in `packages/workflow-editor` or
  `packages/agent-workflow-editor` (future sprint).
- Workflow schema changes.
- Any migration to the workflow versions table.

## Deliverables

- 4 commits, one per finding.
- `packages/module-workflows/src/engine/canonicalize.ts` with a
  documented, deterministic key-sort helper.
- New regression test proving F-03-01: whitespace-only changes to a
  workflow definition no longer bump the version.
- New regression test proving F-03-02: a looping workflow is detected
  in O(n) rather than via content hashing.
- New regression test proving F-03-03: malformed JSON → 400.

## Acceptance criteria

- [x] All 4 findings checked `[x]` in this file.
- [x] `pnpm -F module-workflows test` green (19 tests, 3 files).
- [x] `pnpm -F module-config test` green (24 tests, 2 files).
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [x] **Integration Proposals** section authored by the BO role at
      the bottom of this file before the sprint closes.

## Touched packages

- `packages/module-workflows`
- `packages/module-config`

## Risks

- **R1**: Canonicalizing an existing workflow definition may produce
  a different "baseline" snapshot than the one stored on disk, falsely
  triggering a version bump on first save. *Mitigation*: the canonical
  compare must short-circuit when the stored snapshot has no
  canonical-form metadata, treating it as equal. Record this in a
  code comment with a link to the sprint file.
- **R2**: Infinite-loop detection may over-trigger on legitimately
  revisited states. *Mitigation*: the visited `Set` counts
  *transitions*, not *states*; reset per top-level run.

## Rule references

- `docs/module-rules.md` Rule 7.2 (versions snapshot table),
  Rule 10 (API envelope / error shape).
- `CLAUDE.md` `type-imports`.

## Integration Proposals (BO)

**IP-8 — Canonical snapshot migration**
When F-03-01 lands, existing stored workflow definitions have
non-canonical key ordering. The first real edit to any pre-existing
workflow will correctly detect structural equality (canonicalize
normalizes both sides). However, a one-time migration script that
re-canonicalizes all stored `definition` JSON blobs would improve
consistency and make version-history diffs cleaner. Recommend
scheduling for the next DB migration window.

**IP-9 — Transition budget per execution**
F-03-02 now tracks transition pairs. Consider exposing the
`visitedTransitions.size` metric as part of the execution summary
(via `workflowExecutions.metadata`). This enables dashboards to
show "execution complexity" and helps operators tune `maxIterations`
per workflow rather than relying on the global default (100).

**IP-10 — Consistent JSON validation middleware**
F-03-03 and F-03-04 add per-handler JSON parsing guards. A shared
`parseJsonBody()` utility in `@oven/module-registry/api-utils` would
centralize this pattern. All handlers that call `request.json()`
would benefit. Recommend extracting in a future cross-cutting sprint.
