# Sprint 02 — Memory / context window

> **Triage verdict (sprint-00, HEAD `468ea41`)**: 🛑 **Blocked** —
> `packages/module-chat` does not exist on the session branch
> `claude/eager-curie-0da9Q`. All 4 findings are classified
> `missing-pkg` in `inventory.md`. This sprint can only be executed on
> a branch that already carries `module-chat`. See Q-T-01 in
> `business-owner.md`. The finding table below is preserved unchanged
> so the sprint can be re-run as-is on the correct branch.

## Goal

Make conversation memory reliable. Ensure context-window truncation
never overflows the model budget, archived sessions are bounded, and
chat POSTs actually reach the agent pipeline.

## Scope

Findings to resolve (one commit each):

- [ ] **F-02-01** — `packages/module-chat/src/engine/session-manager.ts` Add a TTL / cleanup mechanism for archived sessions. Propose a deletion policy (default 30 d) and a scheduled cleanup helper. If this requires a schema change, STOP and file a BO question (BO IP-2).
- [ ] **F-02-02** — `packages/module-chat/src/engine/context-manager.ts:72` Guard against a single-message budget overflow: if the last message alone exceeds `maxTokens`, apply message-level truncation instead of keeping it whole.
- [ ] **F-02-03** — `packages/module-chat/src/engine/context-manager.ts:35-72` Replace the `chars/4` estimator with a tokenizer-backed function, OR (if a dep-free tokenizer is not viable) document a higher-bound multiplier for code / JSON and add a unit test that proves the new estimator does not underestimate a known fixture.
- [ ] **F-02-04** — `packages/module-chat/src/api/chat-sessions-messages.handler.ts:53` Implement the agent-invocation pipeline referenced by the stale `TODO`. Reuse the existing invoker in `packages/module-agent-core/src/engine/agent-invoker.ts` — do NOT duplicate logic. Return a structured ack `{ messageId, status: 'queued' }` to the client.

## Out of scope

- Redesigning the session schema (schema migrations are project-wide
  out of scope per BO IP-2).
- Cross-session conversation summarization.
- Moving memory into `module-knowledge-base` (deferred per BO IP-3).

## Deliverables

- 4 commits, one per finding.
- Unit test covering F-02-02's single-message overflow case.
- Unit test covering F-02-03's fixture (minimum: a JSON-heavy
  message whose real token count exceeds the old estimate).
- Integration test in `packages/module-chat/src/__tests__/` proving
  F-02-04 reaches the agent invoker.

## Acceptance criteria

- [ ] All 4 findings checked `[x]` in this file.
- [ ] Zero new `as any`. Zero new cross-module direct imports of
      business logic (Rule 3.1) — `agent-invoker` stays called via
      its public export, not via deep-path import.
- [ ] `pnpm -F module-chat test` green.
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [ ] **Integration Proposals** section authored by the BO role at
      the bottom of this file before the sprint closes.

## Touched packages

- `packages/module-chat`
- `packages/module-agent-core` (read-only inspection; invoker is
  called via its public export)

## Risks

- **R1**: A proper tokenizer is a large dependency. *Mitigation*:
  prefer a documented multiplier; only pull in a tokenizer if the
  BO explicitly approves it via an Open Question.
- **R2**: The `TODO` in `chat-sessions-messages.handler.ts` may hide
  a reason the original author never wired the agent (race, timeout,
  tenant resolution). *Mitigation*: before fixing, read the git log
  for the file and the BO's IP-3 note. If unclear, STOP and file Q.
- **R3**: Session TTL deletion can cascade into messages, attachments,
  or events. *Mitigation*: implement cleanup as a **logical** delete
  first (`status='purged'`) and defer physical deletion to a follow-up
  schema sprint.

## Rule references

- `docs/module-rules.md` Rule 3.1 (no direct cross-module imports),
  Rule 4.3 (FKs as plain integers — no drizzle references across
  module boundaries), Rule 9 (events).
- `CLAUDE.md` `type-imports`.
