# Sprint 00 — Discovery & ADRs

## Goal

Inventory the entire `psychedelic-art/claude-code` source tree, classify
every top-level subsystem, and write Architecture Decision Records that
freeze the integration approach **before any code is touched**.

## Scope

- Clone or fetch a read-only snapshot of `psychedelic-art/claude-code`
  into a temporary location **outside** the repo (e.g.
  `/tmp/psychedelic-claude-code/`). Do **not** commit it.
- For each of the ~36 source folders (`src/tools`, `src/commands`,
  `src/skills`, `src/coordinator`, `src/services`, …), record:
  - line count
  - external dependencies
  - whether it is Bun-specific
  - target OVEN module (or "drop")
- Write 6 ADRs under
  `docs/modules/todo/psychedelic-claude-code-migration/adr/`:
  - `ADR-001-runtime-node-not-bun.md`
  - `ADR-002-tools-in-module-claude-code.md`
  - `ADR-003-commands-as-workflows.md`
  - `ADR-004-skills-as-jsonb-module.md`
  - `ADR-005-mcp-and-plugins-as-adapters.md`
  - `ADR-006-no-terminal-ui.md`

## Out of scope

- Any change to `packages/` or `apps/`.
- Importing source code from the foreign repo.
- Bun-specific build experiments.

## Deliverables

- `docs/modules/todo/psychedelic-claude-code-migration/inventory.md` — a
  table with one row per source folder.
- 6 ADRs (above).
- An updated `STATUS.md` with sprint 00 marked **DONE**.

## Acceptance criteria

- [ ] `inventory.md` covers 100% of `src/*` folders from the upstream repo.
- [ ] Each ADR has: Context, Decision, Consequences, Alternatives.
- [ ] `business-owner.md` § Open questions has zero unresolved questions
      blocking sprint 01.
- [ ] BO has checked the box for sprint 00 in `business-owner.md`.

## Touched packages

_None._ This sprint is documentation only.

## Risks

- **R1**: Inventory drifts from upstream once they update the repo.
  *Mitigation*: record the upstream commit SHA in `inventory.md`.
- **R2**: BO is unavailable to answer open questions in time.
  *Mitigation*: agent stops the sprint and waits — never guesses.

## Rule references

- `docs/module-rules.md` Rule 3 (Pluggable), Rule 4 (Loosely Coupled).
- `CLAUDE.md` general rules — type imports, no inline styles.
