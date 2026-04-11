# Sprint 02 — Tool Catalog Migration

## Goal

Port the ~40 agent tools from `psychedelic-art/claude-code/src/tools/`
into `@oven/module-claude-code` as **discoverable, tenant-scoped,
permission-checked actions**.

## Scope

- For each upstream tool, create:
  - `packages/module-claude-code/src/tools/<tool>.ts` — the executor
    (pure function, takes `{ tenantId, input, ctx }`, returns the
    upstream-compatible result shape).
  - An entry in `claudeCodeModule.chat.actionSchemas` with `name`,
    `description`, JSON-Schema `parameters`, JSON-Schema `returns`,
    `requiredPermissions`, and `endpoint`.
  - A row inserted into the seed for `api_endpoint_permissions`.
- Single dispatch handler at
  `packages/module-claude-code/src/api/tools-invoke.handler.ts`:
  `POST /api/claude-code/[tenantSlug]/tools/[toolName]`. The handler:
  1. Resolves `tenantId` from the slug.
  2. Looks up the tool in the in-memory catalog.
  3. Verifies the caller's permission via auth middleware.
  4. Inserts a `claude_code_tool_invocations` row with `status='running'`.
  5. Awaits the executor.
  6. Updates the row with output + duration + status.
  7. Emits `claude-code.tool.invoked` on the EventBus with the full
     payload (tenantId, sessionId, tool, input, output, durationMs).
- Replace **every** Bun-specific call:
  - `Bun.spawn` → `node:child_process` `spawn`
  - `Bun.file` → `node:fs/promises`
  - `Bun.write` → `node:fs/promises`
  - `import.meta.dir` → `path.dirname(fileURLToPath(import.meta.url))`
- Use `parseListParams` + `listResponse` from
  `@oven/module-registry/api-utils` for the list endpoint
  `GET /api/claude-code/[tenantSlug]/tool-invocations` (Rule 10.1, 10.3).

## Tool tiers (priority order)

1. **Filesystem**: Read, Write, Edit, Glob, Grep, NotebookEdit
2. **Process**: Bash, BashOutput, KillShell
3. **Web**: WebFetch, WebSearch
4. **Code intel**: AstSearch, References, GoToDef
5. **Git**: GitStatus, GitDiff, GitLog, GitCommit
6. **Meta**: TodoWrite, Task (sub-agent dispatch), ExitPlanMode

Anything that requires the IDE bridge, voice, or vim is **deferred**.

## Out of scope

- MCP-backed tools (handled in sprint 07 via the MCP adapter).
- Plugin-provided tools (sprint 08).
- Tool composition into commands (sprint 03).
- React Admin resource for tool invocations UI (sprint 10).

## Deliverables

- All tier-1..tier-6 tools implemented and exported.
- `claudeCodeModule.chat.actionSchemas` length matches the number of
  ported tools.
- `claude_code_tool_invocations` rows are created for every call.
- `claude-code.tool.invoked` event fires on the EventBus.

## Acceptance criteria

- [ ] No `Bun.*` reference remains in `packages/module-claude-code/src/`.
- [ ] Every action in `chat.actionSchemas` has a non-empty
      `requiredPermissions` array (Rule 5.5).
- [ ] Every event payload includes `tenantId` (Rule 5.6).
- [ ] `pnpm -w turbo run lint typecheck build test` is green.
- [ ] A manual `curl POST /api/claude-code/<slug>/tools/Read` with a
      valid token returns the file contents and produces a row in
      `claude_code_tool_invocations`.

## Touched packages

- `packages/module-claude-code/` (extend)
- `packages/module-agent-core/` (only the Tool Wrapper if it needs to
  pick up new actionSchemas — read-only inspection of the registry)

## Risks

- **R1**: Some upstream tools rely on Ink prompts for confirmation.
  *Mitigation*: replace with a `requiresConfirmation: true` flag on
  the actionSchema; the dashboard Run Console handles confirmation in
  sprint 10.
- **R2**: Bash tool is dangerous. *Mitigation*: gate behind
  `claude-code.execute.shell` permission and a per-tenant allowlist
  config key (`ALLOWED_SHELL_BINARIES`, declared in `configSchema`).

## Rule references

Rule 2 (Discoverable), Rule 5.5, Rule 5.6, Rule 9.1, Rule 9.2, Rule 9.4,
Rule 10.1, Rule 10.3, Rule 10.4.
