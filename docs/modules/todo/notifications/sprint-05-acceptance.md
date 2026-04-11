# Sprint 05 — Acceptance

## Goal

Final integration sprint. Run the full dental FAQ WhatsApp flow end-to-end,
close out the module-level acceptance checklist, and graduate the module out
of `todo/` (ask user before moving — the folder move is
hard-to-reverse-feeling).

## Scope

### In

- End-to-end smoke test: a dental tenant onboards a Meta WhatsApp channel
  via the dashboard, an inbound text arrives at
  `/api/notifications/whatsapp/webhook`, the dental FAQ agent answers via
  `module-knowledge-base` search, the reply is delivered, and the dashboard
  shows the conversation and usage gauge.
- `tests/integration/notifications-whatsapp-dental-e2e.test.ts` — at
  whatever location the repo already uses for cross-package integration
  tests. If no such location exists, record the gap in STATUS.md and run
  the flow manually instead of inventing new test infra.
- Module-level acceptance checklist in STATUS.md fully ticked.
- `docs/modules/15-notifications.md` section 6 rewrite to match the
  Rule 13–compliant usage resolver (closes DRIFT-1 once and for all).
- Update `docs/modules/todo/PROGRESS.md` to flip `notifications` to
  `done`.
- Update `docs/modules/todo/README.md` and
  `docs/modules/IMPLEMENTATION-STATUS.md` (if that file exists — it does
  not at the time of this sprint plan; skip that step if still missing
  and record the gap).
- **Ask the user** (via `AskUserQuestion`) before moving the folder from
  `docs/modules/todo/notifications/` to the graduated location. The
  canonical doc set already lives at `docs/modules/notifications/`, so the
  move only affects the `todo/` tracker folder.

### Out

- Marketing broadcasts, opt-in flows, voice — all explicit non-goals per
  `business-owner.md`.

## Deliverables

1. E2E test file (or manual verification log recorded in STATUS.md)
2. Spec update closing DRIFT-1
3. PROGRESS.md update
4. Commit: `docs(notifications): close drift-1 in spec; flip todo progress`
5. Commit (if e2e ships): `test(notifications): dental whatsapp e2e`
6. AskUserQuestion pause for the todo folder graduation move

## Acceptance Criteria

- [ ] The full acceptance checklist in STATUS.md is ticked
- [ ] `grep -rn 'whatsappLimit' docs` returns zero matches
- [ ] `grep -rn 'webLimit' docs` returns zero matches
- [ ] The dental FAQ agent successfully answers an inbound WhatsApp text
  in the smoke test (manual or automated)
- [ ] User approved the todo folder move via AskUserQuestion

## Dependencies

- Sprint-01..04 all done
- `module-knowledge-base` search endpoint available
- `module-agent-core` session handling available

## Risks

- **Integration gap** — if `module-knowledge-base` or `module-agent-core`
  haven't shipped real handlers yet, the e2e can't actually run. Fallback:
  stub the agent response with a canned answer and explicitly mark the
  test as "contract only, not full e2e" in the STATUS.md log.

## Test Plan (TDD)

- Integration test first; then fix any gaps discovered by the run.

## Rule Compliance Checklist

- [ ] All module-rules checkboxes ticked in STATUS.md
- [ ] DRIFT-1 marked resolved in CODE-REVIEW.md
- [ ] DRIFT-2 marked resolved (already done in sprint-01)
- [ ] DRIFT-3 marked resolved (already done in sprint-04)
