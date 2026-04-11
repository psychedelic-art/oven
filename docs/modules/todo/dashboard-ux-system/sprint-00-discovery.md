# Sprint 00 — Discovery

## Goal

Produce enough research, inventory, and rule-compliance output to confidently
enter sprint-01 with zero ambiguity. No code is shipped in this sprint.

## Scope

- Inventory every `*List.tsx`, `*Create.tsx`, `*Edit.tsx`, `*Show.tsx`,
  and `*Playground.tsx` under `apps/dashboard/src/components/**`.
- Inventory every existing playground surface (AI, KB, Agent, Workflow-agents).
- Inventory `apps/dashboard/src/components/CustomMenu.tsx`,
  `AdminApp.tsx`, `apps/dashboard/src/app/layout.tsx`, and
  `apps/dashboard/src/components/shared/**`.
- Cross-check `docs/module-rules.md` Rule 6 (UX Friendly), Rule 5
  (Tenant-Scoped and RLS-Protected), and root `CLAUDE.md` styling rules
  against the current dashboard state.
- External research: multi-tenant workspace switchers (Notion, Clerk,
  Vercel), filter UX systems (PatternFly, bazza/ui, MUI X Data Grid,
  Smart Interface Design), playground UX (OpenAI, LangSmith), and
  zustand-with-React-context patterns (TkDodo).
- Validate that no `dashboard-ux-system` references already exist in
  `apps/`, `packages/`, or `docs/`.

## Out of scope

- Writing any TypeScript, JSX, or CSS
- Touching any file under `packages/` or `apps/dashboard/src/`
- Opening PRs or creating backup branches
- Designing a new brand system or redrawing the React Admin theme

## Deliverables

1. [`CODE-REVIEW.md`](./CODE-REVIEW.md) — complete rule compliance matrix
   with each drift routed to a specific follow-up sprint.
2. [`CODE-REVIEW.md`](./CODE-REVIEW.md) `## Research` section — the 6–12
   production-grade reference shortlist, each entry tagged with the
   sprint that consumes it.
3. [`business-owner.md`](./business-owner.md) — priority tier, success
   criteria, non-goals.
4. This sprint roadmap (sprints 00–07) authored under
   [`docs/modules/todo/dashboard-ux-system/`](./).
5. [`STATUS.md`](./STATUS.md) populated with discovery outputs.

## Acceptance criteria

- [x] CODE-REVIEW.md cites every ground-truth file by name and marks
  pass / partial / fail per rule.
- [x] Every drift found is routed to a specific follow-up sprint.
- [x] External research captured with at least 10 production references,
  each tagged with a sprint.
- [x] Sprint roadmap enumerates 00–07 with acceptance criteria each.
- [x] `mcp__github__search_issues` query confirmed no existing PRs or
  issues touch the program.
- [x] Grep for `dashboard-ux-system` in `apps/`, `packages/`, and
  `docs/` returns only the new files in this folder.

## Dependencies

- `docs/module-rules.md`
- `docs/modules/00-overview.md`
- `docs/modules/13-tenants.md`
- `docs/modules/17-auth.md`
- `docs/modules/20-module-config.md`
- `docs/modules/IMPLEMENTATION-STATUS.md`
- Root `CLAUDE.md`

## Risks

- **None** — discovery is read-only.

## Test plan

- n/a — no code.

## Rule compliance checklist

- [x] Rule 6.1 (CRUD convention) — confirmed PASS in audit
- [x] Rule 6.2 (menu sections) — drift captured (DRIFT-4)
- [x] Rule 6.3 (list views tenant filtering) — drift captured (DRIFT-1)
- [x] Rule 6.4 (create forms auto-assign tenant) — drift captured (DRIFT-1)
- [x] Rule 6.5 (custom editors link) — PASS
- [x] Root `CLAUDE.md` `no-inline-styles` — pre-existing surface clean,
  risk flagged for sprint-05 refactor
- [x] Root `CLAUDE.md` `mui-sx-prop` — enforced on all new files from
  sprint-01
- [x] Root `CLAUDE.md` `zustand-store-pattern` — factory + context
  pattern committed to in sprint-01
- [x] Root `CLAUDE.md` `type-imports` — enforced from sprint-01
