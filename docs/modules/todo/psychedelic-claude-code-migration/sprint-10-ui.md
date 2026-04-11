# Sprint 10 — Dashboard UI

## Goal

Replace the upstream Ink terminal UI with a tenant-aware React Admin
surface inside `apps/dashboard`. Add a "Run Console" custom editor
that lets a user prompt the agent loop, watch streamed events, and
type slash commands.

## Scope

- Add a "Claude Code" section to `apps/dashboard/src/components/CustomMenu.tsx`
  with `<Typography variant="overline">Claude Code</Typography>` and the
  resources below (Rule 6.2).
- React Admin resources (Rule 6.1) under
  `apps/dashboard/src/resources/claude-code/`:
  - `sessions` — list / create / show
  - `tool-invocations` — list / show (read-only)
  - `mcp-servers` — list / create / edit
  - `plugins` — list / show
  - `agent-runs` — list / show with streamed events tab
- Resources for `module-skills`:
  - `skills` — list / create / edit / show
  - Skill `edit` page links to a custom JSONB editor
    (`/skills/[id]/editor`) following the WorkflowEdit pattern
    (Rule 6.5).
- **Run Console** custom route at `/claude-code/console`:
  - Top: tenant selector (reuses `TenantSelector`).
  - Middle: streaming transcript of `agent.*` events for the active
    `agentRunId`, subscribed via SSE on
    `GET /api/agent-runs/[id]/events`.
  - Bottom: input box. Plain text → starts an `agent.run`. Text
    starting with `/` → emits `claude-code.command.invoked`.
- All styling uses MUI `sx` prop — **no** `style={{ }}`,
  **no** `className=` with custom CSS, **no** `styled()`
  (CLAUDE.md `mui-sx-prop` and `no-inline-styles` rules).
- All list views auto-filter by `activeTenantId` (Rule 6.3).
- Create forms auto-assign `tenantId` via `transform` (Rule 6.4).
- Type imports use `import type` (CLAUDE.md `type-imports`).
- Stores use the **zustand factory + provider** pattern
  (CLAUDE.md `zustand-store-pattern`).

## Out of scope

- Mobile/responsive polish beyond what React Admin gives for free.
- Theming.
- Real-time collaboration on a single run.

## Deliverables

- All resources visible in the dashboard sidebar under "Claude Code".
- A new tenant can: create a session → open the Run Console → type
  "list the files in the project root" → see the agent loop call
  the `Glob` tool → see the response streamed.
- Slash command works: typing `/commit` runs the seeded commit
  workflow.

## Acceptance criteria

- [ ] Zero `style={{ }}` in any new file.
- [ ] Zero `className="...custom..."` in any new file.
- [ ] All MUI components use `sx`.
- [ ] All list views filter by tenant when one is selected.
- [ ] Create forms hide the `tenantId` field and auto-assign it.
- [ ] No singleton zustand stores added.

## Touched packages

- `apps/dashboard/` (extend)
- `packages/module-claude-code/` (read-only)
- `packages/module-skills/` (read-only)
- `packages/module-agent-core/` (read-only — adds an SSE endpoint)

## Risks

- **R1**: SSE behind a corporate proxy can fail. *Mitigation*: fall
  back to long polling on the same endpoint.
- **R2**: Run Console transcript can become enormous. *Mitigation*:
  virtualised list (use `react-virtuoso`, already in the workspace if
  available — otherwise add it).

## Rule references

Rule 6.1, Rule 6.2, Rule 6.3, Rule 6.4, Rule 6.5; CLAUDE.md
`no-inline-styles`, `mui-sx-prop`, `type-imports`,
`zustand-store-pattern`.
