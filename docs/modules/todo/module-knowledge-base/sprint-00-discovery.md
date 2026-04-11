# Sprint 00 — Discovery (`module-knowledge-base`)

> Research, decisions, and baseline rule-compliance check. No code is
> produced in this sprint. Completing this sprint unblocks sprint 01.

---

## Goal

Enter sprint 01 with every open design question resolved and every
ground-truth rule mapped to its enforcement point in the upcoming sprints.

## Scope

- Re-read the canonical doc set at `docs/modules/knowledge-base/` and
  confirm it is internally consistent (it is — verified via
  `docs/modules/crosscheck-report.md`).
- Resolve the `kb.search` vs `kb.searchEntries` tool-name mismatch called
  out in `docs/modules/crosscheck-report.md` §4.6 and §6.1.
- Confirm pgvector availability on the target Neon database (blocker for
  sprint 02 — NOT sprint 01).
- Confirm the usage-metering contract with `module-subscriptions` is
  satisfied by `usageMeteringService.trackUsage()` and
  `usageMeteringService.checkQuota()`.
- Capture open questions for the user.

## Out of scope

- Writing code.
- Updating the canonical `docs/modules/knowledge-base/*` files — those
  edits happen in sprint 01 (chat block) and sprint 03 (rate limiting).
- Scaffolding the package.

---

## Decisions recorded

### D1: Tool name is `kb.searchEntries`

**Conflict**: `docs/modules/knowledge-base/api.md` MCP section and
`prompts.md` chat block define the tool as `kb.search`. Every consumer
(`docs/modules/agent-core/api.md`, `docs/modules/chat/api.md`,
`docs/modules/workflow-agents/api.md`) uses `kb.searchEntries`.

**Decision**: standardize on `kb.searchEntries`. Rationale:

1. Three downstream modules already use the longer name.
2. The longer name is more descriptive — `kb.search` is ambiguous when
   combined with a hypothetical future `kb.searchCategories` action.
3. Consistent with `kb.listEntries`, `kb.getEntry` naming already in
   KB's chat block.

**Enforcement**: sprint 01 writes the ModuleDefinition's
`chat.actionSchemas` array with `name: 'kb.searchEntries'`. Sprint 01
also updates `docs/modules/knowledge-base/api.md` §MCP and the chat
block example in `docs/modules/knowledge-base/prompts.md` to match. No
other module docs need changing.

### D2: Schema version strategy uses a companion table

Per module-rules Rule 7.2, every entity with a complex definition or
content that changes over time must have a `{entity}_versions` table.
`kb_entry_versions` is defined in the canonical `database.md` and will
ship in sprint 01. Version auto-snapshot on PUT is sprint 02.

### D3: Embedding is lazy, never synchronous-inline

Per the canonical `architecture.md`, entry create/update responds
immediately and the embedding pipeline runs asynchronously. The caller
polls the `embeddingStatus` column (or listens for the
`kb.entry.embedded` event) to know when the vector is ready. This
decouples request latency from the AI provider round-trip.

**Enforcement**: sprint 02 adds an `embeddingStatus` column
(`pending | processing | ready | failed`) to `kb_entries`. POST/PUT
handlers return with status `pending` and dispatch a background job
via `eventBus.emit('kb.entry.created' | 'kb.entry.updated', ...)`. The
pipeline listener runs the embed call + updates the column + emits
`kb.entry.embedded`.

### D4: Vector column materialization is deferred

The canonical `database.md` defines
`embedding: vector('embedding', { dimensions: 1536 })` on `kb_entries`.
`module-ai`'s current Drizzle schema does NOT use a `vector()` column at
all — vectors live in external stores (pgvector or Pinecone) accessed
via adapters. For KB, we will keep the vector column in the same
database as the row for simplicity and atomicity.

**Enforcement**: sprint 02 enables the `pgvector` extension via a
Drizzle migration and adds the column. Sprint 01 leaves the column out
of the initial schema so that the package builds without the extension
installed (the sprint 01 acceptance criteria is "builds without
pgvector"). The column is added in a follow-up migration in sprint 02.

### D5: Usage metering is mandatory, not opt-in

Every embed and every search MUST track usage against the tenant's plan
via `@oven/module-subscriptions`:

| Operation | Service slug | Amount |
|-----------|--------------|--------|
| Embed one entry | `ai-embeddings` | 1 |
| Embed batch of N | `ai-embeddings` | N |
| Search (query embed + vector query) | `ai-embeddings`, `ai-vector-queries` | 1 each |

**Enforcement**: every code path that calls `ai.embed` or runs a vector
query MUST immediately follow up with `usageMeteringService.trackUsage`.
Sprint 02 covers embed tracking; sprint 03 covers search tracking.

### D6: Public search endpoint is rate-limited by tenant slug + IP

`POST /api/knowledge-base/[tenantSlug]/search` is `isPublic: true` and
must not leak tenant data to other tenants. Rate limit bucket is
`(tenantSlug, remoteIp)` with `SEARCH_RATE_LIMIT_RPM` config (default
30). 429 response on exceeded. Sprint 03 implements this.

---

## Rule compliance checklist (baseline)

Every sprint must keep this checklist green. Sprint 00 only verifies the
canonical doc set already satisfies the contract on paper.

| Rule file | Item | Where enforced |
|-----------|------|----------------|
| `docs/module-rules.md` Rule 1 | `ModuleDefinition` contract | Sprint 01 `src/index.ts` |
| `docs/module-rules.md` Rule 1.2 | Registration order | Sprint 04 edits `apps/dashboard/src/lib/modules.ts` |
| `docs/module-rules.md` Rule 2 | `chat` block with `description`, `capabilities`, `actionSchemas` | Sprint 01 stub → sprint 03 fills search schema |
| `docs/module-rules.md` Rule 2.3 | Typed `events.schemas` | Sprint 01 |
| `docs/module-rules.md` Rule 3.1 | No cross-module imports | Every sprint |
| `docs/module-rules.md` Rule 4.3 | Plain integer FKs | Sprint 01 schema |
| `docs/module-rules.md` Rule 5.1 | `tenantId` column + index | Sprint 01 schema |
| `docs/module-rules.md` Rule 5.2 | Handlers filter by `tenantId` | Sprint 02 handlers |
| `docs/module-rules.md` Rule 5.5 | Permissions seeded | Sprint 02 seed |
| `docs/module-rules.md` Rule 5.6 | `tenantId` in event payloads | Sprint 01 event schemas |
| `docs/module-rules.md` Rule 7.2 | `{entity}_versions` table | Sprint 01 schema (`kb_entry_versions`) |
| `docs/module-rules.md` Rule 7.3 | Auto-snapshot on PUT | Sprint 02 version manager |
| `docs/module-rules.md` Rule 8.1 | `configSchema` declared | Sprint 01 |
| `docs/module-rules.md` Rule 8.3 | Tenant-specific overrides | Sprint 02 resolve calls |
| `docs/module-rules.md` Rule 10.1 | Uses `parseListParams`, `listResponse` | Sprint 02 handlers |
| `docs/module-rules.md` Rule 10.5 | Public endpoint marked | Sprint 03 seed entry |
| `docs/module-rules.md` Rule 11.1 | Table naming `kb_*` | Sprint 01 schema |
| `docs/module-rules.md` Rule 11.2 | Standard columns | Sprint 01 schema |
| `docs/module-rules.md` Rule 11.3 | Required indexes | Sprint 01 schema |
| `docs/module-rules.md` Rule 11.4 | Slug unique | Sprint 01 schema (`unique(tenantId, slug)`) |
| `docs/module-rules.md` Rule 12 | Idempotent seed, `isSystem`, permissions | Sprint 01 + sprint 02 seed |
| `docs/module-rules.md` Rule 13 | No tenant-customizable columns on domain tables | Sprint 01 schema + sprint 02 config reads |
| `CLAUDE.md` (styling) | MUI `sx` only | Sprint 04 UI |
| `CLAUDE.md` (type imports) | `import type` | Every sprint |
| `CLAUDE.md` (zustand) | Factory + context if any store is added | Sprint 04 if KBSearchTest uses local store |
| `docs/package-composition.md` | Package placement under `packages/module-*` | Sprint 01 |
| `docs/routes.md` | API route conventions | Sprint 02 + 03 |
| `docs/use-cases.md` | KB maps to dental FAQ use cases | Already covered by canonical `use-case-compliance.md` |

## Open questions (for user)

1. **pgvector availability**: is the `pgvector` extension enabled on the
   current Neon database? If not, sprint 02 must branch: enable it
   before defining the embedding column, or fall back to storing the
   vector in `module-ai`'s vector store adapter. Default assumption:
   extension is available. Confirm or escalate.
2. **Default embedding model**: canonical config says
   `text-embedding-3-small` (1536 dims). The module-ai default aligns,
   but per-tenant cost-sensitive tenants may prefer a smaller model.
   Sprint 02 honors the config cascade, so no decision needed now —
   just noting the question exists.
3. **Initial dental FAQ seed**: the canonical `prompts.md` §Seed Data
   lists 10 default categories in Spanish. Sprint 02 seeds these
   globally (tenantId NULL = template) or per-tenant-on-create. Default
   decision: categories are tenant-scoped and seeded when a tenant is
   first created (via a `tenants.created` event listener in the KB
   module). Confirm if the user wants a different pattern.

## Deliverables

- [x] This file.
- [x] Decisions recorded above (D1–D6).
- [x] Rule compliance checklist mapped.
- [x] Open questions captured.

## Acceptance criteria

- All six decisions are unambiguous and referenced by a later sprint.
- The rule compliance checklist lists at least every rule that applies.
- The tool-name mismatch resolution is explicit and matches the
  crosscheck report's recommendation (update KB, not the 3 consumers).

## Dependencies

None. Sprint 00 only reads files.

## Risks

- **Risk**: the user prefers `kb.search` over `kb.searchEntries`.
  **Mitigation**: decision D1 is reversible — only the KB module's
  chat block changes. Flipping it in the reverse direction changes 3
  module doc sets instead of 1.

## Test plan

No tests in sprint 00. The sprint is validated by reading the rule
compliance checklist and confirming every applicable rule has an
enforcement point.
