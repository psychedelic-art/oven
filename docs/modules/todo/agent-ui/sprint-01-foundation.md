# Sprint 01 — Foundation: type tighten + MUI ban

## Goal

Tighten the typing across hooks and components and enforce R1.1
("no `@mui/*` imports inside `packages/agent-ui/**`") with a
machine-checkable lint rule, so future PRs cannot regress.

## Scope

- Audit every `hooks/*.ts` file for remaining `any`, `unknown`
  cast, or implicit-`any` parameters. Replace with real types
  grounded in `api.md`.
- Audit every component prop type. Any prop typed as
  `Record<string, unknown>` or `object` is replaced with a
  discriminated-union or concrete interface.
- Add an ESLint `no-restricted-imports` rule scoped to
  `packages/agent-ui/**/*.ts{,x}` blocking every pattern in
  `@mui/*`, `react-router-dom`, and `apps/**`.
- Add a TypeScript project reference / path alias assertion
  (or a vitest-level smoke test) that attempts to import
  `@mui/material` from inside a package file and fails the
  build.

## Out of scope

- Refactoring component layout.
- Adding new features.
- Accessibility (sprint-04).
- Session sidebar wiring (sprint-02).

## Deliverables

- Updated `hooks/*.ts` with zero `any`.
- Updated component prop types (no `Record<string, unknown>`
  or `object`).
- `packages/agent-ui/eslint.config.js` (or equivalent) with
  `no-restricted-imports` rule.
- A test `__tests__/no-mui-imports.test.ts` that scans every
  `.ts(x)` in the package at runtime and fails on any
  `@mui/*` import string.

## Acceptance criteria

- [ ] `pnpm --filter @oven/agent-ui typecheck` is green.
- [ ] `pnpm --filter @oven/agent-ui test` is green with the new
      `no-mui-imports` test asserting zero matches.
- [ ] `grep -r "any" packages/agent-ui/src/hooks/ | wc -l`
      returns the same count as before the sprint (explicit,
      justified `any` only — every remaining one has a
      `// eslint-disable-next-line` with a comment).
- [ ] Every requirement id in the R1.x block of
      `detailed-requirements.md` is machine-checked by either
      typecheck, ESLint, or the new test.
- [ ] `STATUS.md` sprint-01 row flipped to ✅.

## Dependencies

- Sprint 00 inventory.

## Risks

- Fixing the hook types may cascade into `@oven/oven-ui` or
  `@ai-sdk/react` type assertions. Mitigation: keep the cascade
  contained; add discriminated unions locally before touching
  upstream.
- The MUI-ban ESLint rule may break CI if any file sneaked in an
  MUI import. Mitigation: run the rule locally first and fix any
  offenders in the same commit.

## Test plan

- `packages/agent-ui/src/__tests__/no-mui-imports.test.ts` —
  reads every `.ts(x)` file and asserts no `import .* from
  '@mui/.*'` regex match.
- Existing suite must stay green.

## Rule compliance checklist

- [ ] `CLAUDE.md` R1.1/R1.2/R1.3/R1.4 — directly enforced by this
      sprint.
- [ ] `docs/package-composition.md` — the lint rule also blocks
      `apps/**` imports, which enforces package separation.
- [ ] `docs/module-rules.md` §Naming — unchanged.
