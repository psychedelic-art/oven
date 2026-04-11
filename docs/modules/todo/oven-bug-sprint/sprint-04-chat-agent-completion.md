# Sprint 04 — Chat & agent-core completion

> **Triage verdict (sprint-00, HEAD `468ea41`)**: 🛑 **Blocked** —
> `packages/module-agent-core` and `packages/module-chat` do not exist
> on `claude/eager-curie-0da9Q`. Findings F-04-01..04 classified
> `missing-pkg` (agent-core) and F-04-05 classified `missing-pkg`
> (chat). See Q-T-01 in `business-owner.md`. The finding table below
> is preserved unchanged for re-run on the correct branch.

## Goal

Finish the half-built chat → agent wiring and close the permission hole
in tool execution.

## Scope

Findings to resolve (one commit each):

- [ ] **F-04-01** — `packages/module-agent-core/src/api/agent-sessions-messages.handler.ts:26-29` Replace `require('drizzle-orm').sql` with a typed drizzle `select()`. Add the matching import at the top of the file. No dynamic `require`s.
- [ ] **F-04-02** — `packages/module-agent-core/src/engine/tool-wrapper.ts` Thread the calling user's permission set through `executeTool` and reject when the tool declares `requiredPermissions` the caller does not hold. Reuse `checkPermission` from `module-auth` / `module-roles` (BO IP-6) — do not invent a parallel primitive.
- [ ] **F-04-03** — `packages/module-agent-core/src/engine/tool-wrapper.ts:44` Replace the regex-based tool-name generator with a `route.split('/')` parser that handles `[param]` segments correctly.
- [ ] **F-04-04** — `packages/module-agent-core/src/engine/agent-invoker.ts:48,83` Convert value imports used only as types into `import type { ... }`. Remove `as string[]` casts in favor of a typed row shape.
- [ ] **F-04-05** — `packages/module-chat/src/api/chat-sessions-messages.handler.ts` Return a structured ack `{ messageId, status: 'queued' }` so the client can surface an in-flight state (partial overlap with F-02-04; if Sprint 02 already landed, this commit is a no-op confirmation).

## Out of scope

- New tool-registration UX in the dashboard.
- Multi-agent delegation features.
- `requiredPermissions` schema changes.

## Deliverables

- 5 commits, one per finding.
- New test: calling a protected tool without the required role
  returns `403`.
- New test: tool-name generator handles
  `/api/[tenantSlug]/foo/[id]/bar` → `foo.bar` (or whatever the
  documented convention resolves to — document it in a code comment).
- Typed row shape for `AgentRow` in `packages/module-agent-core/src/types.ts`.

## Acceptance criteria

- [ ] All 5 findings checked `[x]` in this file.
- [ ] Zero `require(...)` calls remain in
      `packages/module-agent-core/src/api/**`.
- [ ] `pnpm -F module-agent-core test` green.
- [ ] `pnpm -F module-chat test` green.
- [ ] `pnpm -w turbo run lint typecheck build test` green.
- [ ] **Integration Proposals** section authored by the BO role at
      the bottom of this file before the sprint closes.

## Touched packages

- `packages/module-agent-core`
- `packages/module-chat`
- `packages/module-auth` / `packages/module-roles` (read-only import
  of the `checkPermission` public export)

## Risks

- **R1**: `checkPermission` may not exist in the expected shape.
  *Mitigation*: before touching `tool-wrapper.ts`, open
  `packages/module-auth/src/index.ts` and confirm the export. If it
  doesn't exist, STOP and file a BO question.
- **R2**: The chat ack shape may conflict with whatever Sprint 02
  produced. *Mitigation*: Sprint 04 reads `STATUS.md` at start; if
  Sprint 02 is `✅ Done`, F-04-05 becomes a verification commit only.

## Rule references

- `docs/module-rules.md` Rule 3.1 (no cross-module business-logic
  imports), Rule 5.5 (permission seed).
- `CLAUDE.md` `type-imports`.
