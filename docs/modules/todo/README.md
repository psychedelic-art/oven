# OVEN — Todo / Project Plans

This folder is the home of **multi-sprint project plans** that turn large
initiatives into iterable, async-runnable work packages.

Every plan in this folder is structured so that:

1. A human (or a Claude Code session) can read the project README and
   immediately understand scope, owner, and current sprint.
2. A long-running Claude Code agent can take the project's `PROMPT.md`,
   run it on a dedicated `feature/<folder_name>` branch, and incrementally
   execute one sprint at a time without losing context between runs.
3. A **Business Owner** (BO) document proposes integrations and answers
   "why" questions when ambiguity arises.

---

## Folder layout

```
docs/modules/todo/
  README.md                                  ← this file
  <project-slug>/
    README.md                                ← scope, BO, sprint index, status
    business-owner.md                        ← BO role + integration proposals
    sprint-00-<name>.md
    sprint-01-<name>.md
    ...
    sprint-NN-<name>.md
    PROMPT.md                                ← async runner prompt
    STATUS.md                                ← updated after every sprint run
```

## Naming rules

- Project folder = kebab-case slug (used as branch name suffix).
- Branch convention: `feature/<project-slug>`.
- Sprints are 0-padded (`sprint-00`, `sprint-01`, …) and ordered by number.
- Each sprint file declares: **Goal**, **Scope**, **Out of scope**,
  **Deliverables**, **Acceptance criteria**, **Touched packages**, **Risks**.

## How a project gets executed

1. Open the project folder, read `README.md` and `business-owner.md`.
2. Open `PROMPT.md` — copy it into a new Claude Code session (or trigger
   an async run). The prompt is self-contained: it knows the branch, the
   sprint sequence, the rules under `docs/`, and the stop conditions.
3. The agent updates `STATUS.md` after every sprint, commits with a
   `[sprint-NN] <summary>` prefix, and pushes to
   `feature/<project-slug>`.
4. The BO reviews the diff and either approves the next sprint or
   posts integration proposals back into `business-owner.md`.

## Active projects

| Slug | Title | Branch | Status |
|------|-------|--------|--------|
| `psychedelic-claude-code-migration` | Migrate & integrate `psychedelic-art/claude-code` into OVEN | `feature/psychedelic-claude-code-migration` | Planned |
