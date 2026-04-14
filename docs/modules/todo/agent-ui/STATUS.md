# STATUS — @oven/agent-ui

| Sprint | Title | Status | Last commit | Notes |
|--------|-------|--------|-------------|-------|
| 00 | Discovery & drift audit | Done | cycle-17b | INVENTORY.md: 40 files, 67 tests, 50 R-IDs mapped. 5 MISSING docs, 3 MISSING tests, 13 NEEDS VERIFY. |
| 01 | Foundation: type tighten + lint rule | Done | cycle-21 | Zero `any` in hooks (already clean). ESLint `no-restricted-imports` config added. `no-mui-imports.test.ts` runtime guard added (4 tests). 71 total tests green. |
| 02 | Session sidebar completion | ✅ Done | cycle-35 | Pin/rename/delete/export wired end-to-end. ConfirmDialog, inline rename, client-side search, per-row error cards. +29 tests (ConfirmDialog 10 + SessionSidebar 12 + useSessionManager rename/export/rollback 7). Backend export handler added to module-chat (+4 tests). |
| 03 | Widget bundle guardrails | ✅ Done | cycle-37 | vite widget build works (75 kB gzipped), check:size script enforces 80 kB budget + dangerouslySetInnerHTML guard + OvenChat mount-API regression + content-hash post-build step. BROWSER-MATRIX.md documents Chromium/Firefox/Safari manual smoke checklist. +5 tests (widget-bundle.test.ts). |
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
