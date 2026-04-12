# QA Report — Cycle 21: agent-ui Sprint 01 (foundation: type tighten + MUI ban)

## Branch

- Source: `claude/stoic-hamilton-JTmbo`
- Backup: `bk/claude-stoic-hamilton-JTmbo-20260412`
- Target: `dev`

## Scope

Sprint-01 for `@oven/agent-ui`: enforce package boundary rules (R1.x)
with machine-checkable lint rule and runtime test scan.

## Changes

### New files
- `packages/agent-ui/eslint.config.js` — ESLint flat config with
  `no-restricted-imports` blocking `@mui/*`, `react-router-dom`, `apps/*`
- `packages/agent-ui/src/__tests__/no-mui-imports.test.ts` — runtime
  scan of all source files asserting zero banned imports (4 tests)

### Modified files
- `docs/modules/todo/agent-ui/sprint-01-foundation.md` (acceptance checks)
- `docs/modules/todo/agent-ui/STATUS.md` (sprint-01 done)

## Audit findings

- **`any` in hooks**: Zero explicit `any` type annotations. One comment
  contains the word "any" (line 72 of useDualStateMessages.ts).
- **`@mui/*` imports**: Zero. Package is clean.
- **`react-router-dom` imports**: Zero.
- **`apps/*` imports**: Zero.
- **`Record<string, unknown>`**: ~21 instances, all for metadata/context
  fields that are genuinely unstructured JSON. Not converting these —
  they represent runtime-opaque data from API responses.
- **`import type`**: All type-only imports correctly use `import type`.
- **`style={}`**: 2 instances in LayoutManager.tsx, both for CSS custom
  properties (documented exception in CLAUDE.md).

## Test results

| Package | Tests | Result |
|---------|-------|--------|
| `@oven/agent-ui` | 71 (67 existing + 4 new) | PASS |

## Rule compliance

| Rule | Status |
|------|--------|
| R1.1 (no @mui/*, react-router-dom, apps/*) | Enforced by test + ESLint |
| R1.2 (cn() from @oven/oven-ui) | Compliant |
| R1.3 (no inline style={}) | Compliant (2 exceptions use CSS vars) |
| R1.4 (import type) | Compliant |
| `CLAUDE.md` no inline style | Compliant |
| `docs/package-composition.md` package separation | Enforced by ESLint |

## Verdict

**MERGE** — lightweight enforcement additions, no production code changes.
