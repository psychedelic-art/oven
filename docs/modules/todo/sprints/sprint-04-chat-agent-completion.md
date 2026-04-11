# Sprint 04 — Chat & agent-core completion

**Sprint ID**: `sprint-04`
**Branch**: `feature/bugs`
**Owner package(s)**: `packages/module-chat`, `packages/module-agent-core`
**Related docs**: [`docs/modules/08-chat.md`](../../08-chat.md), [`docs/modules/10-agent-core.md`](../../10-agent-core.md)

## Goal

Finish the half-built chat → agent wiring and close the permission hole
in tool execution.

## Integration Proposals

_To be authored by the Business Owner role after implementation._

## Findings

- [ ] **F-04-01** — `module-agent-core/src/api/agent-sessions-messages.handler.ts:26-29` Replace `require('drizzle-orm').sql` with a typed drizzle `select()` query; add the matching import at the top of the file.
- [ ] **F-04-02** — `module-agent-core/src/engine/tool-wrapper.ts` Thread the calling user's permission set through `executeTool` and reject when the tool declares `requiredPermissions` the caller does not hold.
- [ ] **F-04-03** — `module-agent-core/src/engine/tool-wrapper.ts:44` Replace the regex-based tool-name generator with a `route.split('/')` parser that treats `[param]` segments correctly.
- [ ] **F-04-04** — `module-agent-core/src/engine/agent-invoker.ts:48,83` Convert value imports used only as types into `import type {...}`; remove `as string[]` casts.
- [ ] **F-04-05** — `module-chat/src/api/chat-sessions-messages.handler.ts` Return a structured ack `{ messageId, status: 'queued' }` (or stream) so the client knows whether the agent run is in flight.

## Context for the fixer

- Permission schema lives in `packages/module-roles`.
- Look for `checkPermission` helper in `module-auth` before inventing a
  new one.

## Out of scope

- New tool registration UX in the dashboard.
- Multi-agent delegation features.

## Definition of Done

All 5 findings checked off · new test: calling a protected tool without
the required role returns 403 · typecheck clean.
