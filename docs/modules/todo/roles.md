# Roles — Bug-Sprint Project

> The cleanup program is run as if it were a real product team.
> Each role has a single, well-defined responsibility. When an async
> worker executes a sprint it should **mentally adopt each role in turn**.

---

## Developer (IC)

**Owns**: the actual code change.

**Responsibilities**:
- Read every file referenced by a finding before editing.
- Reproduce the bug in thought (or via a unit test) before fixing it.
- Apply the smallest fix that resolves the finding — no scope creep.
- Respect all rules in `/CLAUDE.md` and `docs/module-rules.md`.
- Write one commit per finding.

**Must not**:
- Refactor unrelated code.
- Add "nice to have" features.
- Touch files not owned by the current sprint.

---

## QA / Tester

**Owns**: proving the fix works.

**Responsibilities**:
- For each finding, decide whether a unit test is feasible. If yes, add one.
- For UX findings in the dashboard, describe a manual repro in the
  commit body so a reviewer can reproduce it.
- Run `pnpm -w test` and `pnpm -w typecheck` after each finding.
- Block the sprint if any pre-existing test regresses.

---

## Tech Lead

**Owns**: architectural consistency.

**Responsibilities**:
- Verify the fix does not break the **module contract**
  (see `docs/module-rules.md`).
- Verify event-bus contracts are honored (no direct cross-module imports).
- Verify the fix does not introduce a new `as any` cast, direct
  `clsx` import, or inline `style={{}}`.
- Approve the sprint branch for merge.

---

## Business Owner

**Owns**: *why the user cares*, and integration opportunities.

This role is the **distinctive feature** of the bug-sprint program.
After a sprint is implemented, the Business Owner writes a short
section at the top of the sprint file titled **"Integration Proposals"**
that answers:

1. **Which other module benefits from this fix?** (e.g. fixing the
   workflow engine infinite-loop detection unlocks reliable agent
   delegation → proposes a closer integration between
   `module-workflows` and `module-workflow-agents`.)
2. **Which user-visible workflow now becomes viable?** (e.g. fixing
   the AI Playground history pagination enables a "share execution"
   link feature.)
3. **What is the next sprint's candidate?** The Business Owner
   proposes the next sprint's focus based on what this sprint unlocked.
4. **Cost/benefit sanity check** — is the fix cheap relative to the
   integration it unlocks?

The Business Owner **does not write code**. They only annotate sprint
files with proposals. Proposals live under:

```markdown
## Integration Proposals
- [ ] ...
```

These can be picked up by a future sprint or filed as new entries
in `backlog.md`.

---

## Role rotation in async execution

When `prompts/run-sprint.md` is executed by an async worker:

1. **Developer** phase — implement all findings, one commit each.
2. **QA** phase — add/run tests, ensure green.
3. **Tech Lead** phase — self-review against module rules.
4. **Business Owner** phase — write the "Integration Proposals"
   section at the top of the sprint file, then commit it with
   message `docs(<sprint-id>): integration proposals`.

Each phase is a distinct mental context. Do not blend them.
