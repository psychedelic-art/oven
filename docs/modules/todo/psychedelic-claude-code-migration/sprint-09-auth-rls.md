# Sprint 09 — Auth, Permissions, RLS

## Goal

Lock down every Claude Code surface with the existing OVEN auth stack
(`module-auth` + `auth-authjs` / `auth-firebase`), seed all permissions,
and define RLS policies for every new tenant-scoped table.

## Scope

- Permissions seeded across all new modules (Rule 5.5):
  - `claude-code.read|execute|manage`
  - `claude-code.execute.shell` (gated by tenant config)
  - `skills.read|create|update|delete|execute`
  - `kb-entries.read-memory|write-memory`
  - `mcp.servers.manage`
  - `plugins.manage`
- All tables get RLS policies (Rule 5.3):
  - `claude_code_sessions`
  - `claude_code_tool_invocations`
  - `claude_code_credentials`
  - `claude_code_mcp_servers`
  - `claude_code_plugins`
  - `skills`, `skill_versions`, `skill_executions`
  - `agent_runs`
- Policies enforce: `tenantId = current_setting('app.current_tenant_id')`
  and role-based action gating.
- Credentials in `claude_code_credentials` are encrypted at rest using
  the existing key management used by `auth-firebase` /
  `module-auth`.
- Public endpoints (e.g. webhook receivers if any) explicitly marked in
  `api_endpoint_permissions` (Rule 10.5). Default: nothing is public.

## Out of scope

- A new credentials UI (sprint 10).
- Multi-region key management.

## Deliverables

- All RLS policies committed as SQL migrations.
- An integration test that proves a tenant cannot read another
  tenant's tool invocations even with a valid JWT.

## Acceptance criteria

- [ ] Every new table has at least one RLS policy.
- [ ] Every new endpoint has a row in `api_endpoint_permissions`.
- [ ] Credentials are never returned in plaintext from any API.
- [ ] Permission seed uses `onConflictDoNothing` (Rule 12.3).

## Touched packages

- `packages/module-claude-code/`
- `packages/module-skills/`
- `packages/module-agent-core/`
- `packages/module-auth/` (read-only — only references the existing
  middleware)

## Risks

- **R1**: RLS policy mistakes can lock out admins. *Mitigation*: keep
  the existing `bypass_rls` super-admin escape hatch documented in
  `module-auth`.

## Rule references

Rule 5.1, Rule 5.2, Rule 5.3, Rule 5.5, Rule 10.5, Rule 12.3.
