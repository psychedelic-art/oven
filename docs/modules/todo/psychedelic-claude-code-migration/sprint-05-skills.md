# Sprint 05 — Skills Module

## Goal

Create `@oven/module-skills`, a JSONB-first, versioned, tenant-scoped
home for the Claude Code "skills" subsystem
(`psychedelic-art/claude-code/src/skills/`).

## Scope

- New package `packages/module-skills/` with the standard layout.
- Tables (Rule 11):
  - `skills` — `id, tenantId, slug UNIQUE, name, description, definition jsonb, version int, enabled bool, isSystem bool, createdAt, updatedAt`
  - `skill_versions` — companion snapshot table (Rule 7.2)
  - `skill_executions` — `id, tenantId, skillId, agentRunId, input jsonb, output jsonb, status, durationMs, createdAt`
- API (Rule 10):
  - `GET/POST /api/skills/[tenantSlug]`
  - `GET/PUT/DELETE /api/skills/[tenantSlug]/[id]`
  - `POST /api/skills/[tenantSlug]/[id]/execute`
  - `POST /api/skills/[tenantSlug]/[id]/versions/[versionId]/restore`
- PUT handler auto-snapshots into `skill_versions` (Rule 7.3).
- Permissions (Rule 5.5):
  - `skills.read`, `skills.create`, `skills.update`, `skills.delete`,
    `skills.execute`
- `chat.actionSchemas` exposes `skills.list`, `skills.get`,
  `skills.execute`.
- Events (Rule 9):
  - `skills.skill.created`
  - `skills.skill.updated`
  - `skills.skill.deleted`
  - `skills.execution.started`
  - `skills.execution.completed`
  - `skills.execution.failed`
- Seed: import the upstream skill JSONs and seed them with
  `isSystem: true` (Rule 12.2). Use delete + recreate (Rule 12.1).
- The agent runtime from sprint 04 can resolve a skill by slug and
  execute it through the new endpoint.

## Out of scope

- Skill marketplace UI.
- Skill authoring editor (basic JSON editor only — sprint 10).
- Cross-tenant skill sharing.

## Deliverables

- Module compiles, tables migrate, seed runs idempotently.
- Agent loop executes a seeded skill end-to-end in an integration
  test.

## Acceptance criteria

- [ ] All checklist items from `docs/module-rules.md` § "Before merging
      a new module" pass.
- [ ] Zero direct imports between `module-skills` and any other module
      (Rule 3.1).
- [ ] `skill_versions` rows are created on every PUT.

## Touched packages

- `packages/module-skills/` (new)
- `apps/dashboard/src/lib/modules.ts` (registration order: after
  `module-agent-core`)

## Risks

- **R1**: Upstream skills assume direct filesystem access at runtime.
  *Mitigation*: skills are stored in the DB, executed via the agent
  loop's tool catalog — no filesystem skill loader.

## Rule references

Rule 1, Rule 2, Rule 5, Rule 7, Rule 9, Rule 10, Rule 11, Rule 12.
