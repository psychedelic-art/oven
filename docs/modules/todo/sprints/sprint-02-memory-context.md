# Sprint 02 — Memory / context window

**Sprint ID**: `sprint-02`
**Branch**: `feature/bugs`
**Owner package(s)**: `packages/module-chat`, `packages/module-agent-core`
**Related docs**: [`docs/modules/08-chat.md`](../../08-chat.md), [`docs/modules/10-agent-core.md`](../../10-agent-core.md)

## Goal

Make conversation memory reliable. Ensure context-window truncation
never overflows the model budget, archived sessions are bounded,
and chat POSTs actually reach the agent.

## Integration Proposals

_To be authored by the Business Owner role after implementation._

## Findings

- [ ] **F-02-01** — `module-chat/src/engine/session-manager.ts` Add a TTL / cleanup mechanism for archived sessions. Propose a deletion policy (default 30d) and a scheduled cleanup handler.
- [ ] **F-02-02** — `module-chat/src/engine/context-manager.ts:72` Guard against a last-message budget overflow: if a single message exceeds `maxTokens`, apply message-level truncation instead of keeping it whole.
- [ ] **F-02-03** — `module-chat/src/engine/context-manager.ts:35-72` Replace the `chars/4` estimator with a tokenizer-backed function (or at minimum, a documented higher-bound multiplier for code/JSON).
- [ ] **F-02-04** — `module-chat/src/api/chat-sessions-messages.handler.ts:53` Implement the agent-invocation pipeline referenced by the `TODO`, or reduce the endpoint to a documented write-only path with a matching client contract.

## Context for the fixer

- Read `packages/module-chat/src/types.ts` for the session shape.
- Read `packages/module-agent-core/src/engine/agent-invoker.ts` for
  how agents are invoked elsewhere — reuse the same helper.
- Tokenizer choice: prefer a dependency-free heuristic that accounts
  for common structured formats; avoid pulling in a 10MB wasm blob.

## Out of scope

- Redesigning the session schema.
- Cross-session conversation summarization (future sprint).

## Definition of Done

All 4 findings checked off · new TTL cleanup covered by a unit test ·
context-manager has a regression test for a single-message overflow ·
agent-invocation path has an integration test in `module-chat/__tests__`.
