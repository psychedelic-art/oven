# Process — Bug-Sprint Project

## Branch strategy

- **Base branch**: `main`
- **Working branch**: `feature/bugs`
  - Always rebase onto `main` at the start of a sprint.
  - Never force-push unless explicitly authorized.
  - Never push to `main` directly.
- One PR per sprint, titled `fix(sprint-NN): <sprint title>`.

## Commit convention

Each finding becomes one commit:

```
fix(sprint-01): type Generate button disabled state

Finding: F-01-07 — AIPlayground.tsx:812 button had no
disabled state when model was unset.

Fix: add `disabled={!model || loading}` predicate.
```

Commit prefixes:
- `fix(...)` — behavioral bug
- `ux(...)` — pure UX improvement
- `perf(...)` — performance
- `chore(...)` — rule compliance / lint
- `docs(...)` — sprint-file annotations (business owner)
- `test(...)` — test-only changes

## Definition of Done (per finding)

A finding is "done" when **all** of the following are true:

- [ ] Code change lands on `feature/bugs`.
- [ ] `pnpm -w typecheck` passes.
- [ ] `pnpm -w lint` passes (if lint is configured for the package).
- [ ] `pnpm -w test` passes; affected package's tests pass.
- [ ] A test or manual repro is documented in the commit body.
- [ ] No new `as any`, no inline `style={{}}`, no raw `clsx` import.
- [ ] The finding row in the sprint file is checked off `[x]`.

## Definition of Done (per sprint)

- [ ] Every finding in the sprint file is checked off.
- [ ] The sprint's "Integration Proposals" section has been authored
      by the Business Owner role.
- [ ] A PR exists on `feature/bugs` referencing all findings.
- [ ] The PR description links back to the sprint file path.

## Scope control

If during a sprint a new bug is discovered:

- **DO NOT** fix it in the current sprint.
- **DO** append it to `backlog.md` under `## Unassigned` with:
  - file:line reference
  - severity
  - one-sentence description
- The Business Owner can promote it to a future sprint.

## Safety rules

- **Never** run destructive git commands (`reset --hard`, `push --force`,
  `branch -D`) without explicit user approval.
- **Never** skip hooks (`--no-verify`).
- **Never** touch `main` or `claude/*` branches.
- **Never** drop tables, delete files outside the sprint scope, or
  modify CI configuration without authorization.
- If a fix requires a breaking schema change, **stop** and escalate —
  do not attempt it inside a cleanup sprint.

## Review ritual

When a sprint PR is up for review:

1. **Tech Lead** walks the commits in order. Each commit must be
   independently reviewable.
2. **Business Owner** reads the "Integration Proposals" section
   and either approves them into `backlog.md` or rejects with a note.
3. Merge only when both pass.
