# QA Report — oven-bug-sprint sprint-03 (cycle-18)

**Branch**: `claude/stoic-hamilton-2ylh0`
**Backup**: `bk/claude-stoic-hamilton-2ylh0-20260412`
**Date**: 2026-04-12
**Reviewer**: Claude Code (senior review)

## Scope

Sprint-03: Workflow engine correctness. 4 findings (F-03-01 through F-03-04).

## Changes reviewed

| File | Change | Rule compliance |
|------|--------|-----------------|
| `packages/module-workflows/src/canonicalize.ts` | New: recursive key-sort + string-trim canonicalizer | OK. Pure function, no side effects. `import type` N/A (no type-only imports). |
| `packages/module-workflows/src/api/workflows-by-id.handler.ts` | Replace `JSON.stringify` comparison with `structurallyEqual()` | OK. Import is value import (function). Comment links to sprint file. |
| `packages/module-workflows/src/engine.ts` | Replace `Set<string>` content-hash loop detection with transition-pair tracking | OK. `previousState` tracked across iterations. `visitedTransitions` Set uses `from->to` keys. |
| `packages/module-workflows/src/api/workflows-execute.handler.ts` | Distinguish empty body from malformed JSON; return 400 | OK. Uses `request.text()` then conditional `JSON.parse`. |
| `packages/module-config/src/api/module-configs.handler.ts` | Wrap `request.json()` in try/catch returning 400 | OK. Error at system boundary (API handler). |
| `packages/module-workflows/vitest.config.ts` | New: vitest config | OK. Standard config matching sibling packages. |
| `packages/module-workflows/package.json` | Add test scripts + vitest devDep | OK. |
| 3 test files | 19 regression tests total | OK. |

## Ground-truth rule checks

| Rule | Status | Notes |
|------|--------|-------|
| No inline `style={{}}` | OK | No JSX in these changes |
| MUI `sx` prop only | N/A | No dashboard UI changes |
| Tailwind `cn()` | N/A | No portal/oven-ui changes |
| `import type` for type-only | OK | All imports verified |
| Zustand factory + context | N/A | No zustand stores touched |
| Error handling at system boundaries only | OK | F-03-03 and F-03-04 are API handlers (system boundary) |
| Canonical doc shape | N/A | No module doc changes |

## Test results

- `@oven/module-workflows`: **19 tests, 3 files, all green**
  - canonicalize.test.ts: 13 tests
  - engine-loop-detection.test.ts: 1 test
  - workflows-execute-handler.test.ts: 5 tests
- `@oven/module-config`: **24 tests, 2 files, all green** (unchanged)

## Risks assessed

- R1 (canonical baseline mismatch): Mitigated. `structurallyEqual` canonicalizes both sides, so stored non-canonical definitions compare correctly.
- R2 (over-triggering loop detection): Mitigated. Transition-pair tracking allows revisited states via different paths.

## Verdict

**PASS** — ready to merge into dev as cycle-18.
