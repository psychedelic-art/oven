# Sprint 05 — Playground Standardization

## Goal

Graduate `UnifiedAIPlayground` from `@oven/agent-ui` to the canonical
dashboard playground shell. Wrap AI / KB / Agent / Workflow-agents
playgrounds in a single MUI Box host that mounts the Tailwind shell.
Delete dead code paths in `ai/AIPlayground.tsx` (~1,809 lines) and
`knowledge-base/KBPlayground.tsx` (~781 lines). Every playground looks,
feels, and debugs the same. Closes DRIFT-3.

## Scope

### In

- `packages/dashboard-ui/src/playground/DashboardPlaygroundShell.tsx` —
  MUI Box wrapper (`sx={{ height: '100%', display: 'flex',
  flexDirection: 'column' }}`) that mounts a passed-in `children`
  React node (expected to be `UnifiedAIPlayground` or a specialised
  subclass). Exposes slots for the MUI page header above the Tailwind
  shell so every playground still has the standard page title /
  breadcrumb chrome.
- `packages/dashboard-ui/src/playground/useDashboardPlaygroundTarget.ts`
  — hook that reads the `:targetSlug` URL param, resolves it against
  the React Admin `dataProvider` (`getOne('agents', ...)`,
  `getOne('knowledge-bases', ...)`, etc.), and returns a
  `PlaygroundTarget` object in the shape
  `UnifiedAIPlayground` already expects.
- Rewire `apps/dashboard/src/components/ai/AIPlayground.tsx` to mount
  `<DashboardPlaygroundShell><UnifiedAIPlayground target={{ kind: 'model', ... }} /></DashboardPlaygroundShell>`.
  Delete the tab infrastructure, the local session state hook, the
  custom chat UI, and anything else that is no longer reachable. Wrapper
  file must be under 100 lines.
- Rewire `apps/dashboard/src/components/knowledge-base/KBPlayground.tsx`
  to mount the same shell with `target={{ kind: 'knowledge-base', id }}`.
  Delete the 3-panel hand-rolled layout, the Autocomplete selectors
  (the canonical selector lives in the shell), and the stats tab (move
  to a standalone page if needed). Wrapper file must be under 100
  lines.
- Rewire `apps/dashboard/src/components/agents/AgentPlaygroundPanel.tsx`
  to mount the shell with `target={{ kind: 'agent', id }}` inside
  the existing collapsible card. Wrapper file must stay under 150 lines.
- `apps/dashboard/src/components/workflow-agents/AIPlaygroundPage.tsx`
  — already a ~40-line wrapper; update its imports to point at the
  new `DashboardPlaygroundShell` so every playground goes through the
  same host.
- Test
  `packages/dashboard-ui/src/__tests__/playground/DashboardPlaygroundShell.test.tsx`
  — renders the shell, passes a stub `UnifiedAIPlayground`, asserts
  layout contract (height: 100%, flex column, page header slot
  rendered when provided).
- Test
  `packages/dashboard-ui/src/__tests__/playground/useDashboardPlaygroundTarget.test.ts`
  — mocks `dataProvider`, asserts target resolution for each `kind`,
  asserts error state when the slug is not found.
- Delete-dead-code report:
  `docs/modules/todo/dashboard-ux-system/playground-deletions.md`
  listing every file and the line range deleted, with a sum total.
- Manual walk-through: open all four playground routes and confirm
  the same shell, same command palette, same inspector tabs, same
  streaming behaviour.

### Out

- Any change to `UnifiedAIPlayground` internals — it is reused as-is
- Any change to `module-chat`, `module-agent-core`, `module-ai`, or
  `module-knowledge-base`
- New playground features (eval report, trace view, etc. — already
  live in `UnifiedAIPlayground`)
- Filter toolbar migration (sprint-06)
- Any change to `packages/agent-ui/`

## Deliverables

1. `packages/dashboard-ui/src/playground/DashboardPlaygroundShell.tsx`
2. `packages/dashboard-ui/src/playground/useDashboardPlaygroundTarget.ts`
3. 4 rewired wrapper files in `apps/dashboard/src/components/**`
4. 2 test files under
   `packages/dashboard-ui/src/__tests__/playground/`
5. `playground-deletions.md` with the line-count report
6. Commit: `feat(dashboard-ui): DashboardPlaygroundShell + target resolver`
7. Commit: `test(dashboard-ui): cover playground shell and target resolver`
8. Commit: `refactor(dashboard): migrate AI / KB / Agent playgrounds to unified shell`
9. Commit: `refactor(dashboard): delete dead code paths in AIPlayground + KBPlayground`
10. Commit: `docs(dashboard-ux-system): record sprint-05 completion + deletion report`

## Acceptance criteria

- [ ] `pnpm --filter @oven/dashboard-ui test` exits 0 with the shell
  + target resolver tests green.
- [ ] `pnpm --filter dashboard typecheck` exits 0.
- [ ] `wc -l apps/dashboard/src/components/ai/AIPlayground.tsx`
  reports under 100 lines.
- [ ] `wc -l apps/dashboard/src/components/knowledge-base/KBPlayground.tsx`
  reports under 100 lines.
- [ ] `wc -l apps/dashboard/src/components/agents/AgentPlaygroundPanel.tsx`
  reports under 150 lines.
- [ ] Every playground wrapper imports `UnifiedAIPlayground` via
  `@oven/agent-ui/playground` — `grep -rn 'UnifiedAIPlayground'
  apps/dashboard/src/components` returns exactly 4 hits.
- [ ] `grep -rn 'style={' apps/dashboard/src/components/{ai,agents,knowledge-base,workflow-agents}`
  returns no new hits versus `dev`.
- [ ] All four playgrounds mount the same shell in the manual walk-through.
- [ ] `STATUS.md` updated with commit hashes and the deletion count.

## Dependencies

- Sprint-01 (foundation primitive — the shell's page header uses the
  chrome barrel stub from sprint-01 until sprint-06 fills it in)
- Sprint-03 (tenant context — the shell reads `useTenantContext` to
  scope the target resolver)
- `packages/agent-ui/src/playground/UnifiedAIPlayground.tsx` (consumed
  as-is)
- `module-agent-core` (read-only, via `dataProvider.getOne('agents',
  ...)`)
- `module-knowledge-base` (read-only, via
  `dataProvider.getOne('knowledge-bases', ...)`)
- `module-ai` (read-only, via `dataProvider.getList('ai-models', ...)`)
- `module-workflow-agents` (read-only, same pattern)
- Root `CLAUDE.md` `mui-sx-prop` and `tailwind-cn-utility` — the style
  boundary stays at the Box container
- Research R9 (OpenAI Prompt playground) — split-panel layout validation
- Research R10 (LangSmith Playground v2) — unified layout across prompt
  / trace / eval
- Use case: **unified playground interaction** (`$PRIMARY_USE_CASES`)

## Risks

- **Style boundary leak** — if any rewritten wrapper accidentally
  applies a Tailwind class to an MUI component or a `sx` prop to the
  Tailwind shell, the theme breaks. Mitigation: the shell test asserts
  `grep` checks that wrappers never emit Tailwind `className=` values.
- **UnifiedAIPlayground prop drift** — `UnifiedAIPlayground`'s
  `target` prop shape may evolve. Mitigation: lock
  `useDashboardPlaygroundTarget` output against a type import from
  `@oven/agent-ui/playground`.
- **Deleting live code paths** — some of `AIPlayground.tsx`'s 1,809
  lines may be reached by tests or customer demos we didn't find.
  Mitigation: before deleting, search the repo for every symbol the
  file exports; if nothing imports a symbol, delete it; if anything
  imports, move the symbol into a standalone utility file under the
  same directory.

## Test plan

- TDD order:
  1. Write `DashboardPlaygroundShell.test.tsx` asserting layout slot
     contract; implement the shell.
  2. Write `useDashboardPlaygroundTarget.test.ts`; implement the hook.
  3. Migrate `AIPlayground.tsx` wrapper. Run dashboard dev server;
     manually walk through /ai/playground; confirm identical behaviour.
  4. Migrate `KBPlayground.tsx` wrapper; manual walk-through.
  5. Migrate `AgentPlaygroundPanel.tsx`; manual walk-through via the
     `AgentEdit` page.
  6. Update `AIPlaygroundPage.tsx` import; manual walk-through via
     `/workflow-agents/:id/playground`.
  7. Delete dead code paths; re-run all four walk-throughs.
  8. Record before / after line counts in `playground-deletions.md`.

## Rule compliance checklist

- [ ] Rule 6.5 — custom editors linked from edit pages remain unchanged
- [ ] Rule 6.3 — shell reads `useTenantContext` for target scoping
- [ ] Root `CLAUDE.md` `mui-sx-prop` — MUI wrappers use `sx` only
- [ ] Root `CLAUDE.md` `tailwind-cn-utility` — Tailwind code lives
  entirely inside `@oven/agent-ui`
- [ ] Root `CLAUDE.md` `no-inline-styles` — no `style={}` in wrappers
- [ ] Root `CLAUDE.md` `type-imports` — all type-only imports correct
