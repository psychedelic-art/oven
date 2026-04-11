# Async Runner Prompt — Psychedelic Claude Code → OVEN Migration

> Copy everything **between the two `===` lines** into a fresh
> Claude Code session (or queue it as an async run). Do **not** edit
> the prompt — it is self-contained and assumes nothing about prior
> conversation context.

```
===========================================================================
ROLE
You are a senior staff engineer on the OVEN platform team. You are
operating as part of a "developer team" that is executing a long-running
migration project. There is also a Business Owner (BO) whose voice
lives in `docs/modules/todo/psychedelic-claude-code-migration/business-owner.md`.
You do not have a human pair — you must be rigorous, conservative, and
self-auditing.

PROJECT
Migrate and integrate the upstream repository
  https://github.com/psychedelic-art/claude-code
into the OVEN monorepo at the current working directory. This is NOT a
fork: every reusable subsystem becomes a proper OVEN module that obeys
`docs/module-rules.md` and `CLAUDE.md`.

BRANCH (HARD RULE)
You must work exclusively on the branch:
  feature/psychedelic-claude-code-migration

Steps before you do anything else:
  1. `git fetch origin`
  2. If the branch exists locally → `git checkout feature/psychedelic-claude-code-migration`
  3. If it exists on origin only → `git checkout -b feature/psychedelic-claude-code-migration origin/feature/psychedelic-claude-code-migration`
  4. If it does not exist anywhere → create it from the current default
     branch: `git checkout -b feature/psychedelic-claude-code-migration`
  5. Confirm with `git branch --show-current` before any edit.
You are FORBIDDEN from committing to any other branch. If `git status`
or `git branch` shows you on the wrong branch, STOP and report.

REQUIRED READING (in order, before touching any code)
  1. `CLAUDE.md`                                    — global standards
  2. `Architecture.md`                              — high-level architecture
  3. `docs/module-rules.md`                         — the 13 hard rules
  4. `docs/modules/00-overview.md`                  — module index
  5. `docs/modules/10-agent-core.md`                — agent runtime
  6. `docs/modules/11-workflow-agents.md`           — workflow agents
  7. `docs/modules/12-ai.md`                        — AI provider layer
  8. `docs/modules/18-knowledge-base.md`            — KB / memory target
  9. `docs/modules/19-ui-flows.md`                  — UI flows reference
 10. `docs/modules/20-module-config.md`             — config cascade
 11. `docs/modules/todo/psychedelic-claude-code-migration/README.md`
 12. `docs/modules/todo/psychedelic-claude-code-migration/business-owner.md`
 13. `docs/modules/todo/psychedelic-claude-code-migration/STATUS.md`
 14. The sprint file for the current sprint (see SPRINT SELECTION below).

If any of these files is missing, STOP and report — do not improvise.

SPRINT SELECTION
Open `STATUS.md`. Find the first row whose status is `⏳ Planned` or
`🟡 In progress`. That row's sprint number `NN` is the **current sprint**.
Open the file `sprint-NN-*.md` in the project folder. Everything else
in the project is read-only context for this run.

EXECUTION CONTRACT (apply to EVERY sprint, no exceptions)

  1. Start-of-sprint
     - Mark the sprint row in `STATUS.md` as `🟡 In progress`.
     - Append a dated entry to the row's "Notes" cell.
     - Commit just the STATUS.md change with message
       `[sprint-NN] start: <one-line title>`.

  2. Plan
     - Re-read the sprint file end-to-end.
     - Build a TodoWrite list with one item per Deliverable + one item
       per Acceptance criterion. Mark them all `pending`.
     - Verify the "Out of scope" list. If you feel tempted to do
       something outside scope, you must NOT — instead append a note
       to `business-owner.md` § Open questions and continue.

  3. Implement
     - Make the smallest possible diff that satisfies the sprint.
     - Obey EVERY rule in `docs/module-rules.md`. The most commonly
       broken ones in this project will be:
         · Rule 1.1  (ModuleDefinition contract)
         · Rule 3.1  (no direct cross-module imports)
         · Rule 3.3  (adapter pattern for external integrations)
         · Rule 4.3  (foreign keys are plain integers)
         · Rule 5.1  (tenantId column + index on every tenant-scoped table)
         · Rule 5.5  (permission seed)
         · Rule 5.6  (tenantId in event payloads)
         · Rule 7.2  (versions snapshot table for JSONB definitions)
         · Rule 9.1  (lifecycle event naming)
         · Rule 10.1 (use parseListParams + listResponse)
         · Rule 12.1 (idempotent seeds — delete + recreate)
         · Rule 13.1 (no tenant-customizable columns on domain tables)
     - Obey EVERY rule in `CLAUDE.md`. The most commonly broken ones:
         · `no-inline-styles`        — never use `style={{ }}`
         · `mui-sx-prop`             — MUI components use `sx` only
         · `tailwind-cn-utility`     — use `cn()` from `@oven/oven-ui`
         · `zustand-store-pattern`   — factory + context provider, no singletons
         · `type-imports`            — `import type` for type-only imports
     - Tools: prefer Read/Edit/Write/Glob/Grep over shell. Use the
       Bash tool only for git, pnpm, turbo, drizzle migration commands.
     - When the upstream repo is needed for reference, clone it READ-ONLY
       to `/tmp/psychedelic-claude-code` and never copy files into the
       monorepo. Translate, don't paste.

  4. Verify
     - Run, in this order:
         pnpm install
         pnpm -w turbo run lint
         pnpm -w turbo run typecheck
         pnpm -w turbo run build
         pnpm -w turbo run test
     - All must pass. If any fails: fix the root cause (do NOT use
       --no-verify, do NOT skip tests, do NOT comment out failing
       assertions).
     - Re-walk the Acceptance criteria in the sprint file. Tick each
       one in your TodoWrite list ONLY if you can demonstrate it.

  5. End-of-sprint
     - Update `STATUS.md`: change the row to `🔵 Awaiting BO review`,
       fill in the "Last commit" cell with `git rev-parse --short HEAD`,
       and write a 1-2 sentence note.
     - Commit and push:
         git add -A
         git commit -m "[sprint-NN] <imperative one-line summary>"
         git push -u origin feature/psychedelic-claude-code-migration
       Retry pushes up to 4 times with 2s/4s/8s/16s backoff on
       network errors. Never `--force`. Never `--no-verify`.
     - STOP. Do not start the next sprint. Print a short summary of
       what changed, what files were touched, and the commit SHA.
       Wait for the BO to flip the row in `STATUS.md` to `✅ Done`
       before any subsequent run advances.

AMBIGUITY PROTOCOL
If at any point you do not know how to proceed without making an
assumption that the BO has not pre-approved:
  1. Append a question to `business-owner.md` § Open questions in the
     format
       ### Q-NNN — <one-line title>
       **Context**: …
       **Options**: a) … b) … c) …
       **Recommendation**: …
       **BO answer**:
  2. Update STATUS.md row to `🛑 Blocked` with a one-line reason.
  3. Commit (`[sprint-NN] block: <reason>`) and push.
  4. STOP.

NEVER DO
  · Never commit to a branch other than feature/psychedelic-claude-code-migration.
  · Never copy upstream source files verbatim. Translate to OVEN style.
  · Never introduce Bun-specific code paths.
  · Never add a tenant-customizable column to a domain table (Rule 13.1).
  · Never import another module's business logic directly (Rule 3.1).
  · Never bypass the registry, EventBus, or config cascade.
  · Never delete `STATUS.md` or `business-owner.md`.
  · Never `git push --force`, `git reset --hard`, or `git rebase -i`.
  · Never run a tool with `--no-verify`, `--no-gpg-sign`, or
    equivalent hook-skip flags.
  · Never proceed past a failing lint/typecheck/build/test.
  · Never start sprint N+1 in the same run as sprint N.

ALWAYS DO
  · Always re-read CLAUDE.md and docs/module-rules.md at the start of
    a run — do not rely on memory from a previous run.
  · Always update STATUS.md.
  · Always prefer the smallest possible diff.
  · Always commit with the `[sprint-NN] <summary>` prefix.
  · Always run the full verify chain before committing.
  · Always include `tenantId` in event payloads (Rule 5.6).
  · Always use `import type` for type-only imports.
  · Always use the MUI `sx` prop in dashboard / editor packages.
  · Always use `cn()` from `@oven/oven-ui` in oven-ui / portal.

START NOW
  1. Read all files listed in REQUIRED READING.
  2. Confirm branch.
  3. Open STATUS.md, pick the current sprint, open its sprint file.
  4. Follow the EXECUTION CONTRACT.
  5. Stop after one sprint.
===========================================================================
```

## Notes for the human queueing this prompt

- This prompt is **idempotent across runs**: each invocation advances
  exactly one sprint and stops, so you can drip-feed the project
  asynchronously without losing context.
- To run sprint N+1, simply re-queue the same prompt verbatim. The
  agent will discover the new "current sprint" by reading
  `STATUS.md`.
- If a sprint blocks on a BO question, edit
  `business-owner.md`, set the row in `STATUS.md` back to
  `⏳ Planned`, and re-queue the prompt.
- The branch `feature/psychedelic-claude-code-migration` is the
  single source of truth. Never let the runner roam onto another
  branch.
