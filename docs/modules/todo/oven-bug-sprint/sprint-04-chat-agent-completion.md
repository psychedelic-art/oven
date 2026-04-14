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

- [x] **F-04-01** — `packages/module-agent-core/src/api/agent-sessions-messages.handler.ts:26-29` Replace `require('drizzle-orm').sql` with a typed drizzle `select()`. **CLOSED cycle-38** — typed `db.select({ slug: agents.slug }).from(agents).where(eq(agents.id, ...)).limit(1)`. No dynamic requires remain in `packages/module-agent-core/src/api/**`.
- [x] **F-04-02** — `packages/module-agent-core/src/engine/tool-wrapper.ts` Thread permissions through executeTool. **CLOSED cycle-38** — `executeTool(tool, input, baseUrl, { permissions })` does a set check against `tool.requiredPermissions` and throws `ToolPermissionError` on miss. NOTE: we did NOT import `checkPermission` from module-auth/module-roles because neither package exports such a primitive today (risk R1 verified by grep). Callers pass a `Set<string>` — when the BO adds `checkPermission`, swap the set check for that helper.
- [x] **F-04-03** — `packages/module-agent-core/src/engine/tool-wrapper.ts:44` Replace regex tool-name generator. **CLOSED cycle-38** — `routeToToolName(moduleSlug, route)` splits on `/`, drops `api`, drops `[param]` segments, drops empty segments. 5 unit tests cover the cases in the finding description.
- [x] **F-04-04** — `packages/module-agent-core/src/engine/agent-invoker.ts:48,83` Convert value imports + remove `as string[]` casts. **CLOSED cycle-38** — new `AgentRow` interface in `types.ts`; invoker uses a single `typedAgent` cast and typed local variables (`llmConfig: LLMConfig`, `exposedParams: string[]`, `toolBindings: string[]`).
- [x] **F-04-05** — `packages/module-chat/src/api/chat-sessions-messages.handler.ts` Structured ack. **CLOSED cycle-38** — non-streaming path returns `{ messageId, status: 'queued', sessionId, role }`. Overlaps with F-02-04; counted once.

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
