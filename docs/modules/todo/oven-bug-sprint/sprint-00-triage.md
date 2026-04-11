# Sprint 00 — Triage & audit re-validation

## Goal

Re-verify every finding in `README.md` § 3 against the current `HEAD`
of `feature/bugs`, drop findings that have already been fixed, and
freeze the backlog before Sprint 01 begins. Produce an `inventory.md`
that is the single source of truth for the rest of the project.

## Scope

- For each `F-NN-MM` row in `README.md` § 3:
  - Open the referenced file and line.
  - Confirm the bug still exists on `feature/bugs`.
  - If fixed → strike the row (`~~F-NN-MM~~`), add a note in
    `inventory.md` with the commit SHA that fixed it.
  - If worse than described → update the severity and description.
  - If the repro steps are unclear → leave it in place but add a
    "needs repro" flag in `inventory.md`.
- Write `docs/modules/todo/oven-bug-sprint/inventory.md` with one
  row per finding: `ID · File:Line · Sev · Status · Notes`.
- Record the HEAD commit SHA at the top of `inventory.md` so drift
  is detectable on future runs.

## Out of scope

- Any code change.
- Adding new findings beyond the original 33 (new ones go into the
  README's § 3 Unassigned subsection, not inventory).
- Sprint 01+ work.

## Deliverables

- `docs/modules/todo/oven-bug-sprint/inventory.md` with 100 % of
  findings classified as `active`, `fixed`, `invalid`, or `needs-repro`.
- `STATUS.md` row for sprint 00 flipped to `🔵 Awaiting BO review`.
- Sprint files for 01–06 updated: strike any finding that the
  triage marked `fixed` or `invalid`.

## Acceptance criteria

- [ ] `inventory.md` covers 100 % of the IDs in `README.md` § 3.
- [ ] Each row in `inventory.md` has a verified `Status`.
- [ ] Zero finding has a stale file:line reference (every cited file
      exists, every cited line is within the file's current length).
- [ ] `business-owner.md` § Open questions has zero unresolved
      questions blocking sprint 01.

## Touched packages

_None._ This sprint is documentation only.

## Risks

- **R1**: A finding looks fixed but the fix only masked the symptom.
  *Mitigation*: when marking a row `fixed`, record the commit SHA
  and a two-line explanation.
- **R2**: File line numbers shifted since the audit. *Mitigation*:
  search for the cited code snippet, not the line number. Update the
  row with the new line once located.

## Rule references

- `docs/module-rules.md` Rule 4 (Loosely Coupled) — triage never
  re-classifies a module's ownership.
- `CLAUDE.md` general rules — documentation only, no inline styles
  or untyped imports to introduce.
