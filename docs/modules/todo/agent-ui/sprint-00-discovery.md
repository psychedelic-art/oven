# Sprint 00 — Discovery & drift audit

## Goal

Reconcile the freshly-scaffolded `docs/modules/agent-ui/` canonical
set with the actual code in `packages/agent-ui/src/` and catalogue
every piece of drift before any future sprint lands.

## Scope

- Read every canonical doc file.
- Walk every file under `packages/agent-ui/src/`.
- Produce `INVENTORY.md` in this folder listing:
  - Each exported component / hook / util / theme.
  - The doc file that documents it (or "MISSING" if none).
  - Any public prop or return type whose shape differs from
    what the canonical docs claim.
  - Any file that exists in code but is documented nowhere.
  - Any file documented that does not exist in code.

## Out of scope

- Writing any code.
- Fixing any drift (that is sprint-01 and onward).
- Adding dependencies.

## Deliverables

- `docs/modules/todo/agent-ui/INVENTORY.md`
- Requirement-ID map: one table row per requirement (R1.1..R11.4)
  from `../../agent-ui/detailed-requirements.md` plotted against
  (a) the code location that satisfies it, or (b) "NOT YET".
- A prioritised drift list for sprint-01+ (one bullet per item).

## Acceptance criteria

- [ ] `INVENTORY.md` exists and covers every `.ts(x)` file under
      `packages/agent-ui/src/`.
- [ ] Every R-ID in `detailed-requirements.md` has a row.
- [ ] Every row labelled "NOT YET" has a sprint target in
      sprint-01..05.
- [ ] `STATUS.md` sprint-00 row is flipped to ✅.

## Dependencies

- Canonical docs exist (done in cycle-5).

## Risks

- Inventory may reveal undocumented features we forgot about.
  Mitigation: add them to the relevant doc file in the same
  commit.
- Drift may exceed what the planned sprints can absorb.
  Mitigation: triage, split, and renumber sprints.

## Test plan

Docs-only sprint. No test expectations beyond "the inventory
reconciles on a subsequent manual re-read".

## Rule compliance checklist

- [ ] `docs/module-rules.md` — N/A (docs-only).
- [ ] `docs/package-composition.md` — Verify no cross-package
      import surprises appear in the inventory.
- [ ] `CLAUDE.md` — N/A (docs-only).
- [ ] Canonical doc shape — Already 11/11 from cycle-5.
