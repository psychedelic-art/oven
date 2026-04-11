# OVEN — Future Modules Architecture

> **Last Updated**: 2026-04-05
> **Status**: Mixed — Phases 1-3 Implemented, Phases 4-5 Planned
>
> | Module | Phase | Status | Tests | Tables | Routes |
> |--------|-------|--------|-------|--------|--------|
> | **module-ai** | 1 | DONE | 102 | 9 | 32+ |
> | **module-knowledge-base** | 2 | DONE | 19 | 4 | 15+ |
> | **module-agent-core** | 3 | BACKEND DONE | 15 | 6 | 22 |
> | **module-chat** | 4A | IN PROGRESS | — | 8 (planned) | ~30 (planned) |
> | **agent-ui** | 4B | NEXT | — | 0 (editor pkg) | 0 |
> | **module-workflow-agents** | 5 | FUTURE | — | 6 (planned) | 17 (planned) |
>
> See [IMPLEMENTATION-STATUS.md](./IMPLEMENTATION-STATUS.md) for detailed per-module tracking.
> **Base Architecture**: Next.js 15 + React Admin 5 + Drizzle ORM + Neon Postgres + Turbo + pnpm
> **Module Rules**: All modules must comply with [module-rules.md](../module-rules.md) — 12 hard requirements for registration, discoverability, pluggability, loose coupling, multi-tenancy, RLS, UX, and more.

---

## Design Principles

Every module in this specification follows the same core principles that govern the existing OVEN modules:

1. **Modular** — Each module is a standalone package at `packages/module-{name}/` implementing the `ModuleDefinition` contract. It exports its own schema, API handlers, React Admin resources, and event declarations. No module requires another to function unless explicitly listed as a dependency.

2. **Pluggable** — Modules register themselves into the `ModuleRegistry` at startup. The system discovers capabilities at runtime (API endpoints, events, schemas) rather than hard-coding references. Adding a module means importing it in `modules.ts` and running a migration — nothing else changes.

3. **Loosely Coupled** — Modules communicate through the **EventBus** (pub/sub), **shared config** (3-tier cascade), and **REST API calls**. There are no direct imports between module business logic. Cross-module foreign keys use plain `integer()` columns, not Drizzle references.

4. **Convention over Configuration** — Every module follows identical patterns: `schema.ts` for tables, `api/*.handler.ts` for endpoints, `index.ts` for the `ModuleDefinition`, and optionally a separate `packages/{name}-editor/` for visual builder UIs. Editor packages use plain library APIs (e.g., `grapesjs.init()` in `form-editor`) rather than framework-specific wrappers, keeping them lightweight and framework-agnostic where possible.

5. **JSON-First Definitions** — Complex structures (workflow definitions, RLS policies, form layouts, dashboard configs) are stored as JSONB in Postgres and versioned with snapshot tables. This enables visual builders to save/load/restore without schema migrations.

---

## Module Map

```
                            ┌─────────────────────┐
                            │      module-chat     │
                            │ (conversational UI,  │
                            │  @ai-sdk/react hooks)│
                            └──────────┬──────────┘
                                       │ delegates reasoning to
                            ┌──────────▼──────────┐
                            │  module-agent-core   │
                            │  (agent management,  │
                            │   CRUD, tool wrapper, │
                            │   multimodal invoke)  │
                            └──────────┬──────────┘
                                       │ orchestrates via
                         ┌─────────────▼─────────────┐
                         │  module-workflow-agents    │
                         │  (graph-based reasoning,   │
                         │   LLM nodes, tool loops,   │
                         │   MCP auto-generation)     │
                         └─────────────┬─────────────┘
                                       │ discovers & acts on all modules
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
  ┌───────▼────────┐    ┌─────────────▼────────────┐   ┌──────────▼──────────┐
  │  module-flows  │    │     module-forms          │   │  module-dashboards  │
  │  (pipelines)   │    │  (GrapeJS page builder)   │   │  (data explorer)    │
  └───────┬────────┘    └─────────────┬────────────┘   └──────────┬──────────┘
          │                           │                            │
          │ triggers                  │ extends                    │ reads from
          ▼                           ▼                            ▼
  ┌───────────────┐    ┌──────────────────────────┐   ┌──────────────────────┐
  │module-workflows│   │  Educational ecosystem:   │   │ module-analytics-    │
  │  (existing)    │   │  ┌─ module-question-types │   │    forms             │
  └───────────────┘    │  ├─ module-questions      │   │ (GrapeJS analytics)  │
                       │  ├─ module-exams          │   └──────────────────────┘
                       │  └─ module-scoring-engine │
                       └──────────────────────────┘
                                    │
                            ┌───────▼────────┐
                            │  module-roles  │  (existing — permissions for all)
                            └────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                              Core Infrastructure                        │
  │                                                                          │
  │  module-tenants ─── module-auth ─── module-files ─── module-notifications│
  │  (multi-tenancy)    (adapters:      (bucket         (adapters:           │
  │  (domains,          Firebase,       storage)        Twilio, Meta,        │
  │   hierarchy)        Auth0, AuthJS)                  Resend)              │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                     Tenant-Facing Portal Layer                           │
  │                                                                          │
  │  module-ui-flows ──→ module-forms ──→ apps/portal (Next.js subdomain)   │
  │  (dynamic pages,     (GrapeJS         (serves tenant portals on          │
  │   routing, themes)    page rendering)  *.domain.com + custom domains)    │
  │                                                                          │
  │  module-knowledge-base ─── module-chat (agent-ui widget)                 │
  │  (FAQ entries,              (embedded in portal pages)                    │
  │   embeddings, search)                                                    │
  └──────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────────┐
  │                       module-ai                                          │
  │  (provider-agnostic AI services layer — Vercel AI SDK)                   │
  │                                                                          │
  │  Providers: OpenAI, Anthropic, Google, Mistral, Groq…                    │
  │  Tools: generateText, embed, generateImage, TTS, RAG…                    │
  │  Vector DBs: pgvector, Pinecone, Qdrant, ChromaDB…                       │
  │  React: @ai-sdk/react (useChat, useObject, useCompletion)                │
  │                                                                          │
  │  Used by: chat, agent-core, workflow-agents, forms,                      │
  │           dashboards, scoring-engine, and all modules                     │
  └──────────────────────────────────────────────────────────────────────────┘
```

---

## Module Specifications

Each module has its own detailed specification:

| # | Module | Package(s) | Spec File |
|---|--------|-----------|-----------|
| 1 | Flows | `module-flows` | [01-flows.md](./01-flows.md) |
| 2 | Forms (**In Progress**) | `module-forms` + `form-editor` | [02-forms.md](./02-forms.md) |
| 3 | Question Types | `module-question-types` | [03-question-types.md](./03-question-types.md) |
| 4 | Questions | `module-questions` | [04-questions.md](./04-questions.md) |
| 5 | Exams | `module-exams` | [05-exams.md](./05-exams.md) |
| 6 | Scoring Engine | `module-scoring-engine` | [06-scoring-engine.md](./06-scoring-engine.md) |
| 7 | Analytics Forms | `module-analytics-forms` + `analytics-editor` | [07-analytics-forms.md](./07-analytics-forms.md) |
| 8 | Chat | `module-chat` | [08-chat.md](./08-chat.md) |
| 9 | Dashboards | `module-dashboards` + `dashboard-editor` | [09-dashboards.md](./09-dashboards.md) |
| 10 | Agent Core | `module-agent-core` | [10-agent-core.md](./10-agent-core.md) |
| 11 | Workflow Agents | `module-workflow-agents` | [11-workflow-agents.md](./11-workflow-agents.md) |
| 12 | AI Services | `module-ai` | [12-ai.md](./12-ai.md) |
| 13 | Tenants | `module-tenants` | [13-tenants.md](./13-tenants.md) |
| 14 | Files | `module-files` | [14-files.md](./14-files.md) |
| 15 | Notifications | `module-notifications` + adapters | [15-notifications.md](./15-notifications.md) |
| 16 | Agent UI | `agent-ui` (editor package) | [16-agent-ui.md](./16-agent-ui.md) |
| 17 | Auth | `module-auth` + adapters | [17-auth.md](./17-auth.md) |
| 18 | Knowledge Base | `module-knowledge-base` | [18-knowledge-base.md](./18-knowledge-base.md) |
| 19 | UI Flows | `module-ui-flows` + `ui-flows-editor` | [19-ui-flows.md](./19-ui-flows.md) |

### Apps

| App | Location | Purpose |
|-----|----------|---------|
| Dashboard | `apps/dashboard/` | Admin dashboard (React Admin 5) — existing |
| Portal | `apps/portal/` | Tenant-facing portals on subdomains — [architecture](../apps-portal.md) |

---

## Shared Infrastructure Extensions

These modules will require the following extensions to the existing core:

### ModuleDefinition Enhancements

The `ModuleDefinition` interface in `module-registry/src/types.ts` needs new optional fields so that modules can self-describe for Chat discovery and cross-module composition:

- **`description`** — Human-readable summary of what the module does
- **`capabilities`** — Structured list of actions the module can perform (for agent tool selection)
- **`contentTypes`** — What types of content this module can produce (for Flows integration)
- **`componentLibrary`** — Registered components that other modules (Forms, Analytics) can reuse
- **`chat`** — Self-description block for agent discovery: `{ description, capabilities, actionSchemas }`. Used by `module-agent-core`'s Tool Wrapper and `module-chat`'s backing agent to understand what a module can do and how to interact with it. See [10-agent-core.md](./10-agent-core.md) for details.

### EventBus Patterns

All new modules should emit lifecycle events following the existing `{module}.{entity}.{action}` convention:

- `flows.item.created`, `flows.item.stage-changed`, `flows.item.published`
- `forms.form.created`, `forms.form.submitted`
- `questions.question.created`, `questions.question.updated`
- `exams.attempt.started`, `exams.attempt.completed`
- `scoring.score.calculated`, `scoring.rubric.applied`
- `chat.action.executed`, `chat.session.created`
- `agents.agent.created`, `agents.execution.completed`, `agents.tool.invoked`
- `agents-workflow.execution.started`, `agents-workflow.execution.paused`, `agents-workflow.mcp.generated`
- `dashboards.dashboard.created`, `dashboards.view.saved`
- `ai.provider.created`, `ai.tool.invoked`, `ai.vectorStore.created`, `ai.usage.budgetWarning`
- `tenants.tenant.created`, `tenants.tenant.updated`, `tenants.domain.verified`
- `notifications.message.received`, `notifications.message.sent`, `notifications.usage.limitExceeded`
- `kb.entry.created`, `kb.entry.updated`, `kb.entry.embedded`
- `ui-flows.flow.published`, `ui-flows.page.visited`, `ui-flows.form.submitted`

### Versioning Pattern

All modules storing JSON definitions should use the established versioning pattern:
- Main table has `version` integer, incremented on definition change
- Companion `{entity}_versions` table stores historical snapshots
- PUT handlers auto-create snapshots when the definition changes
- Version history panel in visual editors, with restore endpoint

### Multi-Tenancy

All modules storing tenant-specific data must comply with [module-rules.md](../module-rules.md) Rule 5:
- Every tenant-scoped table has a `tenantId` column with index
- API handlers filter by `tenantId` from auth context
- Events include `tenantId` in payload
- RLS policies can be created for any module table via the visual RLS builder

### Module Rules Compliance

Every module spec in this folder must satisfy the 12 rules in [module-rules.md](../module-rules.md):
1. Registered as a Module (ModuleDefinition contract)
2. Discoverable (`chat` block, event schemas)
3. Pluggable (no cross-module imports, adapter pattern)
4. Loosely Coupled (EventBus, plain integer FKs)
5. Tenant-Scoped and RLS-Protected
6. UX Friendly (React Admin conventions)
7. JSON-First Definitions (JSONB + version tables)
8. Config Cascade (configSchema entries)
9. Event-Driven Integration (lifecycle + domain events)
10. API Design (shared utilities, Content-Range)
11. Schema Design (standard columns, indexes)
12. Seed Data (idempotent, permissions)
