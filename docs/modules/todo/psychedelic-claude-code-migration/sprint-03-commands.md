# Sprint 03 — Slash Commands → Workflows

## Goal

Convert the ~85 slash commands from
`psychedelic-art/claude-code/src/commands/` into **seeded workflow
definitions** owned by `module-workflows`. Re-using the existing
workflow engine avoids building a parallel command runtime and gives
every command versioning, a visual editor, and trigger support for free.

## Scope

- Read each upstream command file. Extract:
  - the command's name (`/commit`, `/review`, `/doctor`, …)
  - its parameters
  - its high-level steps (which tools it calls, in what order)
- Author one JSONB workflow definition per command under
  `packages/module-claude-code/src/seed/commands/<name>.workflow.json`.
- Extend `module-claude-code/src/seed.ts` to upsert these workflow
  definitions through the `module-workflows` API at seed time:
  - Use the **delete + recreate** pattern (Rule 12.1).
  - Tag every workflow with `category: 'claude-code-command'` and
    `isSystem: true` (Rule 12.2).
- Define one shared trigger event:
  `claude-code.command.invoked` with payload schema declared in
  `claudeCodeModule.events.schemas` (Rule 2.3).
- The Run Console (sprint 10) emits this event when a user types
  `/commit` etc. The wiring runtime auto-runs the matching workflow.

## Out of scope

- A new command runtime.
- Slash command auto-completion UI (sprint 10).
- Per-tenant custom commands (deferred to a follow-up project).

## Deliverables

- `seed/commands/*.workflow.json` — one file per ported command.
- A `claude-code.command.invoked` event with documented schema.
- A "Claude Code Commands" filter / saved view in the existing
  workflows React Admin resource (read-only — no new resource needed).

## Acceptance criteria

- [ ] Re-running the seed produces an identical set of rows in
      `workflow_definitions` (idempotent — Rule 12.1).
- [ ] All commands have `category: 'claude-code-command'` and
      `isSystem: true`.
- [ ] Emitting `claude-code.command.invoked` with `name: 'commit'`
      executes the corresponding workflow end-to-end in a test tenant.
- [ ] Workflow snapshots land in `workflow_definition_versions`
      (Rule 7.2).

## Touched packages

- `packages/module-claude-code/` (seed + events)
- `packages/module-workflows/` (read-only — only writes via its API)

## Risks

- **R1**: Some commands have hidden interactivity (prompts, confirms).
  *Mitigation*: every interactive step becomes a workflow `pause`
  state; the Run Console resumes it via
  `POST /api/workflows/[id]/resume`.
- **R2**: Workflow JSON grows huge for complex commands (`/review`).
  *Mitigation*: split into sub-workflows; cross-reference by slug.

## Rule references

Rule 2.3, Rule 7.1, Rule 7.2, Rule 9.3, Rule 12.1, Rule 12.2.
