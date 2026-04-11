# Module Todo Workflow

This folder holds the in-flight graduation queue for OVEN modules. Each
subfolder represents one module being worked on between its top-level
spec (`docs/modules/NN-<module>.md`) and its canonical doc folder
(`docs/modules/<module>/`), plus two cross-cutting programs
(`oven-bug-sprint`, `psychedelic-claude-code-migration`) that run on
the same sprint-based rhythm.

## Per-module folder shape

Every active todo folder contains:

- `README.md` — What the module/program is, why it is in the queue,
  links to spec + code.
- `STATUS.md` — Current sprint, % complete, blockers, QA outcomes,
  backup branches, PR / merge commit links.
- `PROMPT.md` *(optional)* — The long-running agent prompt for this
  module/program.
- `business-owner.md` *(optional)* — Business priority and acceptance
  criteria from the BO.
- `sprint-NN-<slug>.md` — One per sprint. Always includes
  `sprint-00-discovery` (or `-triage`), `sprint-01-foundation`, and a
  terminal `sprint-NN-acceptance`.
- `QA-REPORT.md` *(when audited)* — Produced when a feature branch is
  reviewed.
- `CODE-REVIEW.md` *(when reviewed)* — Produced during senior code
  review.

## Canonical module doc shape

Graduated modules live under `docs/modules/<module>/` with the exact
11-file shape:

```
Readme.md, UI.md, api.md, architecture.md, database.md,
detailed-requirements.md, module-design.md, prompts.md,
references.md, secure.md, use-case-compliance.md
```

Reference examples: `docs/modules/agent-core/`, `docs/modules/ai/`,
`docs/modules/chat/`, `docs/modules/knowledge-base/`,
`docs/modules/workflow-agents/`, `docs/modules/ui-flows/`.

## Active queue

See `PROGRESS.md` for the live state table. Snapshot:

| Slug | Type | Branch origin | Status |
|------|------|---------------|--------|
| `ui-flows` | Module | `claude/eager-curie-TXjZZ` | Canonical doc set graduated; sprints in review |
| `config` | Module | `claude/eager-curie-INifN` | Canonical doc set graduated; cascade resolver tests (24) passing |
| `notifications` | Module | `claude/eager-curie-4GaQC` | Canonical doc set graduated; `@oven/module-notifications` package scaffolded, tests (37) passing — NOT YET registered in `apps/dashboard/src/lib/modules.ts` |
| `module-knowledge-base` | Module | `claude/eager-curie-LRIhN` | Todo sprints added (sprint-00..05); canonical folder already exists on dev |
| `oven-bug-sprint` | Program | `claude/eager-curie-0da9Q` | Triage (sprint-00) + 6 sprints imported; ready for execution |
| `psychedelic-claude-code-migration` | Program | (owned elsewhere) | Planned — NOT touched by this pipeline |

## Graduation definition of done

A module leaves `docs/modules/todo/<module>/` only when:

1. All sprint files have their acceptance checklists marked complete.
2. The canonical doc folder `docs/modules/<module>/` contains all 11
   files with real content (no placeholders).
3. `docs/modules/IMPLEMENTATION-STATUS.md` lists the module as live.
4. Unit tests exist in the module's package(s) at a level comparable
   to a graduated sibling.
5. The dashboard UI is reachable and the primary golden path has been
   manually verified.

The todo folder is then deleted in the same commit that publishes the
graduation.
