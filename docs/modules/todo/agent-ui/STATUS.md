# STATUS — @oven/agent-ui

| Sprint | Title | Status | Last commit | Notes |
|--------|-------|--------|-------------|-------|
| 00 | Discovery & drift audit | ⏳ Planned | — | Canonical docs scaffolded in cycle-5. No drift audit run yet. |
| 01 | Foundation: type tighten + lint rule | ⏳ Planned | — | Remaining `any` spots across hooks; add `eslint-no-restricted-imports` rule banning `@mui/*` inside `packages/agent-ui/**`. |
| 02 | Session sidebar completion | ⏳ Planned | — | Pin/unpin wiring partial. |
| 03 | Widget bundle guardrails | ⏳ Planned | — | Add size budget, document manual cross-browser matrix. |
| 04 | Accessibility hardening | ⏳ Planned | — | R11.1..R11.4. Use `vitest-axe` + manual contrast checks. |
| 99 / 05 | Acceptance | ⏳ Planned | — | Graduation gate. |

**Status legend**: ⏳ Planned · 🟡 In progress · 🔵 Awaiting BO review · ✅ Done · 🛑 Blocked

## Cycle-5 seed

- 2026-04-11 — canonical 11-file doc shape scaffolded at
  `docs/modules/agent-ui/` from the extensive 660-line
  `docs/modules/16-agent-ui.md` spec + a scan of the live
  `packages/agent-ui/src/` source.
- Todo folder created with README + this STATUS + 6 sprint files.
- No code changes in cycle-5; package source is untouched.

## Backup

The cycle-5 session branch `claude/inspiring-clarke-e8QUu` is
backed up via `bk/claude-inspiring-clarke-JuFO1-20260411` (the
parent merge) and the commit SHAs below:

- Canonical scaffold commit — see cycle-5 push log
- Sprint plan commit — see cycle-5 push log
