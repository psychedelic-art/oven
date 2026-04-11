# sprint-99-acceptance — ui-flows

## Goal

Graduate `module-ui-flows` out of the todo queue. This sprint only
flips once every prior sprint has landed on `dev` and the module
matches the graduation contract in `docs/modules/todo/README.md`
(section "Graduation definition of done").

## Scope

- Verify the canonical doc folder is still accurate (re-diff against
  code).
- Run the full `pnpm turbo run lint typecheck test build` across
  every affected filter.
- Manually verify the portal golden path on a seeded tenant.
- Move the folder: delete `docs/modules/todo/ui-flows/`; keep
  `docs/modules/ui-flows/`.
- Update `docs/modules/todo/PROGRESS.md` to mark the row as graduated
  and promote the next candidate from the P1 list.
- Update `docs/modules/IMPLEMENTATION-STATUS.md` to mark ui-flows as
  live.

## Out of scope

Anything that is a new feature. Bug fixes discovered during
acceptance go back into the sprint queue under a new
`sprint-NN-<slug>.md` file.

## Deliverables

- The folder move described above.
- `QA-REPORT.md` archived into
  `docs/modules/ui-flows/qa-2026-graduation.md` for traceability.
- PROGRESS.md + IMPLEMENTATION-STATUS.md updates.

## Acceptance criteria

- [ ] All previous sprint files marked complete.
- [ ] `pnpm turbo run lint typecheck test build
      --filter=...@oven/module-ui-flows
      --filter=...@oven/ui-flows-editor
      --filter=@oven/portal` exits 0.
- [ ] Portal golden path manually verified on
      `http://clinica-xyz.localhost:3001`: inicio → agendar → faq →
      chat → form submit → analytics event recorded.
- [ ] `docs/modules/todo/ui-flows/` deleted in the same commit as the
      PROGRESS.md and IMPLEMENTATION-STATUS.md updates.
- [ ] No rule compliance checkbox in any earlier sprint is still
      unchecked.

## Dependencies

- sprint-00-discovery ✅ (this session)
- sprint-01-foundation
- sprint-02-portal-app
- sprint-03-editor-hardening

## Risks

| Risk                                                     | Mitigation                                                           |
|----------------------------------------------------------|-----------------------------------------------------------------------|
| Folder move is irreversible-feeling                      | Graduation requires AskUserQuestion approval before deletion         |
| Hidden test flake                                        | Re-run `turbo test` 3× in a row before graduating                    |
| Drift between `19-ui-flows.md` spec and canonical docs  | Re-diff during this sprint; update whichever is wrong                 |

## Test plan

No new tests. Acceptance is purely verification.

## Rule compliance checklist

- [ ] Every earlier sprint's Rule Compliance section is fully checked.
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` reflects the new state.
- [ ] `docs/modules/todo/PROGRESS.md` reflects the new queue.
