# OVEN — Future Modules Architecture

> **Last Updated**: 2026-02-24
> **Status**: Specification (pre-implementation)
> **Base Architecture**: Next.js 15 + React Admin 5 + Drizzle ORM + Neon Postgres + Turbo + pnpm

---

## Design Principles

Every module in this specification follows the same core principles that govern the existing OVEN modules:

1. **Modular** — Each module is a standalone package at `packages/module-{name}/` implementing the `ModuleDefinition` contract. It exports its own schema, API handlers, React Admin resources, and event declarations. No module requires another to function unless explicitly listed as a dependency.

2. **Pluggable** — Modules register themselves into the `ModuleRegistry` at startup. The system discovers capabilities at runtime (API endpoints, events, schemas) rather than hard-coding references. Adding a module means importing it in `modules.ts` and running a migration — nothing else changes.

3. **Loosely Coupled** — Modules communicate through the **EventBus** (pub/sub), **shared config** (3-tier cascade), and **REST API calls**. There are no direct imports between module business logic. Cross-module foreign keys use plain `integer()` columns, not Drizzle references.

4. **Convention over Configuration** — Every module follows identical patterns: `schema.ts` for tables, `api/*.handler.ts` for endpoints, `index.ts` for the `ModuleDefinition`, and optionally a separate `packages/{name}-editor/` for visual builder UIs.

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

          ┌──────────────────────────────────────────────────────────┐
          │                       module-ai                          │
          │  (provider-agnostic AI services layer — Vercel AI SDK)   │
          │                                                          │
          │  Providers: OpenAI, Anthropic, Google, Mistral, Groq…    │
          │  Tools: generateText, embed, generateImage, TTS, RAG…    │
          │  Vector DBs: pgvector, Pinecone, Qdrant, ChromaDB…       │
          │  React: @ai-sdk/react (useChat, useObject, useCompletion)│
          │                                                          │
          │  Used by: chat, agent-core, workflow-agents, forms,      │
          │           dashboards, scoring-engine, and all modules     │
          └──────────────────────────────────────────────────────────┘
```

---

## Module Specifications

Each module has its own detailed specification:

| # | Module | Package(s) | Spec File |
|---|--------|-----------|-----------|
| 1 | Flows | `module-flows` | [01-flows.md](./01-flows.md) |
| 2 | Forms | `module-forms` + `form-editor` | [02-forms.md](./02-forms.md) |
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

### Versioning Pattern

All modules storing JSON definitions should use the established versioning pattern:
- Main table has `version` integer, incremented on definition change
- Companion `{entity}_versions` table stores historical snapshots
- PUT handlers auto-create snapshots when the definition changes
- Version history panel in visual editors, with restore endpoint
