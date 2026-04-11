# OVEN — Todo / Bug-Sprint Project

> **Home for sprint-organized cleanup work on the OVEN monorepo.**
> Every sprint here is a self-contained, async-executable unit of work
> that ships on the `feature/bugs` branch.

## What this folder is

This is not runtime code. It is the **planning surface** for a recurring
cleanup program that treats the OVEN codebase as a product with a
backlog. Each sprint is a markdown file that:

- Enumerates a tight, scoped set of defects / UX issues / rule violations
- Defines a clear Definition of Done (DoD)
- Can be fed to an async worker (Claude Code subagent, human dev, etc.)
  via [`prompts/run-sprint.md`](./prompts/run-sprint.md)

## Folder layout

```
docs/modules/todo/
├── README.md          — this file
├── backlog.md         — flat master list of all known findings
├── roles.md           — dev team + business owner role definitions
├── process.md         — sprint cadence, branch strategy, DoD
├── sprints/
│   ├── sprint-01-ai-playground-ux.md
│   ├── sprint-02-memory-context.md
│   ├── sprint-03-workflow-engine.md
│   ├── sprint-04-chat-agent-completion.md
│   ├── sprint-05-handler-typesafety.md
│   └── sprint-06-rule-compliance.md
└── prompts/
    └── run-sprint.md  — the async runner prompt (copy-paste ready)
```

## How to use

1. **Pick a sprint** from `sprints/`. Each sprint is a standalone unit.
2. **Copy the runner prompt** from `prompts/run-sprint.md`.
3. **Fill in the `{{SPRINT_FILE}}` placeholder** with the sprint path.
4. **Launch asynchronously** — the runner will check out `feature/bugs`,
   implement the sprint, commit per finding, and open a PR.
5. **Business owner** (see `roles.md`) reviews the PR, proposes
   integrations with neighboring modules, and approves / requests changes.

## Ground rules (non-negotiable)

- All work lands on **`feature/bugs`**. Never `main`.
- One commit per finding, prefixed `fix(<sprint-id>):` or `chore(<sprint-id>):`.
- Must respect **every** rule in [`/CLAUDE.md`](../../../CLAUDE.md) —
  no inline `style={{}}`, no raw `clsx`, `import type` for types.
- Must respect [`docs/module-rules.md`](../../module-rules.md) if the
  fix touches module boundaries.
- Scope discipline: **do not** refactor outside the sprint's findings.
  New bugs discovered → add to `backlog.md`, do not fix inline.

## Status

| Sprint | Focus | Findings | Status |
|--------|-------|----------|--------|
| 01 | AI Playground UX & type safety | 10 | ready |
| 02 | Memory / context window | 4 | ready |
| 03 | Workflow engine correctness | 4 | ready |
| 04 | Chat & agent-core completion | 5 | ready |
| 05 | Handler type safety (SQL injection risk) | 5 | ready |
| 06 | Cross-cutting rule compliance | 5 | ready |

Total: **33 tracked findings** across 6 sprints.
