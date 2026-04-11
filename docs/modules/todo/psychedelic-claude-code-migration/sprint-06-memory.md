# Sprint 06 — Memory & Context Compression

## Goal

Move the upstream `memdir/` and `memory/` subsystem into
`@oven/module-knowledge-base` as a dedicated namespace, so that agent
memory benefits from existing embeddings, RLS, and tenant isolation
**without** introducing a parallel storage layer.

## Scope

- Add a `namespace` column to the existing `kb_entries` table (or
  the equivalent — read `docs/modules/18-knowledge-base.md` first).
  If a namespace mechanism already exists, reuse it.
- Reserve namespace slug `agent-memory`.
- Port the upstream "context compression" routine (summarise the last
  N steps when token budget is exceeded) into
  `module-agent-core/src/runtime/compression.ts` — it writes the
  summary as a new `kb_entries` row tagged with the run id.
- Expose two new actions on `module-knowledge-base.chat.actionSchemas`:
  - `kb.memory.append` — append a memory entry for an agent run.
  - `kb.memory.search` — semantic search over the namespace.
- Permissions (Rule 5.5): `kb-entries.write-memory`,
  `kb-entries.read-memory`.

## Out of scope

- Vector index tuning.
- A new memory UI (use the existing KB list view filtered by namespace).

## Deliverables

- Agent runs in sprint 04 can compress old steps into memory and
  later retrieve them by similarity.
- Memory is RLS-protected per tenant.

## Acceptance criteria

- [ ] No new tables added — memory lives in `kb_entries`.
- [ ] All memory writes go through the KB API, never direct SQL from
      `module-agent-core` (Rule 3.1, Rule 4.4).
- [ ] Compression triggers when context > configurable threshold
      declared in `configSchema` (Rule 8.1, Rule 13.2).

## Touched packages

- `packages/module-knowledge-base/` (extend)
- `packages/module-agent-core/` (call KB via fetch)

## Risks

- **R1**: Adding a column to `kb_entries` requires a migration on
  existing data. *Mitigation*: column is nullable with default
  `'default'`; existing rows back-fill in the same migration.

## Rule references

Rule 3.1, Rule 4.4, Rule 5, Rule 8.1, Rule 13.2.
