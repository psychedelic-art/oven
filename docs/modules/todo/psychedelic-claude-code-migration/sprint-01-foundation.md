# Sprint 01 — `module-claude-code` Foundation

## Goal

Create the empty-but-compliant `@oven/module-claude-code` package so that
later sprints can drop tools, MCP adapters, and plugin adapters into it
without re-doing scaffolding.

## Scope

- Create `packages/module-claude-code/` with:
  - `package.json` (name `@oven/module-claude-code`)
  - `tsconfig.json` extending the workspace base
  - `src/index.ts` exporting a `claudeCodeModule: ModuleDefinition`
  - `src/schema.ts` with the initial Drizzle tables (see below)
  - `src/seed.ts` (idempotent: delete + recreate, see Rule 12.1)
  - `src/types.ts`
  - `src/api/` with `sessions.handler.ts`, `sessions-by-id.handler.ts`
- Initial Drizzle tables (all `tenantId` indexed, Rule 5.1 + Rule 11.3):
  - `claude_code_sessions` (id, tenantId, slug, status, metadata jsonb)
  - `claude_code_tool_invocations` (id, tenantId, sessionId, tool, input jsonb, output jsonb, status, durationMs, createdAt)
  - `claude_code_credentials` (id, tenantId, kind, encryptedValue, createdAt)
- Permissions seeded (Rule 5.5, Rule 12.3 — `onConflictDoNothing`):
  - `claude-code.read`
  - `claude-code.execute`
  - `claude-code.manage`
- Register the module in `apps/dashboard/src/lib/modules.ts` in
  dependency order **after** `module-agent-core` and `module-tenants`.
- Add the module to the workspace via `pnpm-workspace.yaml` (already
  globbed) and run `pnpm install`.

## Out of scope

- Any tool implementations.
- Any UI / React Admin resources.
- Any MCP or plugin adapters.
- Skills, memory, coordinator integration.

## Deliverables

- The new package compiles under `pnpm -F @oven/module-claude-code build`.
- `pnpm -w turbo run typecheck` is green.
- The module appears in `registry.getAll()` at dashboard boot.
- Drizzle migration generated and committed.

## Acceptance criteria

- [ ] `ModuleDefinition` contract is satisfied (Rule 1.1).
- [ ] `chat` block is present with `description` and an empty
      `actionSchemas: []` (filled in sprint 02).
- [ ] All tables have `tenantId` + index (Rule 5.1, Rule 11.3).
- [ ] Foreign keys are plain integers (Rule 4.3).
- [ ] Seed function is idempotent (Rule 12.1).
- [ ] `apps/dashboard` boots with no console errors.

## Touched packages

- `packages/module-claude-code/` (new)
- `apps/dashboard/src/lib/modules.ts`

## Risks

- **R1**: Drizzle migration generation produces noisy diffs against the
  shared schema. *Mitigation*: commit the generated SQL alongside the
  schema change in the same commit.
- **R2**: Table name collision. *Mitigation*: prefix every table with
  `claude_code_` (Rule 11.1).

## Rule references

Rule 1, Rule 5.1, Rule 5.5, Rule 11.1, Rule 11.2, Rule 11.3, Rule 12.1,
Rule 12.3.
