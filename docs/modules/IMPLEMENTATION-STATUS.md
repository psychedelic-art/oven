# AI Module Ecosystem — Implementation Status

> Last Updated: 2026-04-05
> Tracks implementation progress for all AI-related modules.

---

## Module Dependency Chain

```
module-ai (Phase 1 ✅ DONE)
  └── module-knowledge-base (Phase 2 ✅ DONE)
        └── module-agent-core (Phase 3 ✅ BACKEND DONE)
              ├── module-chat (Phase 4A — NEXT)
              ├── agent-ui (Phase 4B — UI only, parallel with 4A)
              └── module-workflow-agents (Phase 5)
```

---

## 1. module-ai — Phase 1 COMPLETE

**Package**: `packages/module-ai/`
**Spec**: `docs/modules/12-ai.md` + `docs/modules/ai/*.md`

| Area | Status | Details |
|------|--------|---------|
| Schema | DONE | 9 tables: aiProviders, aiModelAliases, aiVectorStores, aiUsageLogs, aiBudgets, aiBudgetAlerts, aiTools, aiGuardrails, aiPlaygroundExecutions |
| Engine | DONE | 7 components: provider-registry, model-resolver, middleware, cost-calculator, encryption, guardrail-engine, usage-tracker |
| API Handlers | DONE | 32+ routes registered in apiHandlers |
| Tests | DONE | 102 tests / 10 suites — all passing |
| Events | DONE | 15 events emitted with typed schemas |
| Seed | DONE | 23 permissions, 16+ tools, 3 providers, 9 aliases, 1 vector store |
| Config | DONE | 8 configSchema keys |
| Chat Block | DONE | description, capabilities, 4 actionSchemas |
| Dashboard UI | DONE | 22 components + 4 custom pages (AI Playground with 6 tabs) |

### Phase 1.5 Gaps (Non-Blocking for Phase 4)

| Gap | Priority | Description | Files |
|-----|----------|-------------|-------|
| Missing handler registrations | LOW | multimodal, transcribe, speech handler files exist but NOT in apiHandlers | `src/index.ts` |
| No vector store operation API | MEDIUM | Adapter has upsert/query/delete but no handlers expose them | Need new handler files |
| Streaming output guardrails | LOW | `wrapStream` in middleware skips output guardrail evaluation | `src/engine/middleware.ts` |
| Rate limiting not enforced | MEDIUM | Config key + column exist but no enforcement logic | `src/engine/middleware.ts` |
| Service catalog not seeded | LOW | UC-7 doc says 6 services auto-seeded but seed.ts doesn't do it | `src/seed.ts` |
| Tenant provider resolution | LOW | providerRegistry.resolve() doesn't filter by tenantId | `src/engine/provider-registry.ts` |

---

## 2. module-knowledge-base — Phase 2 COMPLETE

**Package**: `packages/module-knowledge-base/`
**Spec**: `docs/modules/18-knowledge-base.md` + `docs/modules/knowledge-base/*.md`
**Dependencies**: module-ai (embeddings), module-tenants

| Area | Status | Details |
|------|--------|---------|
| Schema | DONE | 4 tables: kb_knowledge_bases, kb_categories, kb_entries, kb_entry_versions. Vector column via raw SQL. knowledgeBaseId FK on categories and entries. |
| Engine | DONE | embedding-pipeline.ts (embedEntry, bulkEmbed), search-engine.ts (semantic, keyword, hybrid) |
| API Handlers | DONE | 11 files, 15+ endpoints registered in apiHandlers + dashboard route files |
| Tests | DONE | 19 tests / 2 suites passing (embedding-pipeline: 7, search-engine: 12) |
| Events | DONE | 11 events with typed schemas in ModuleDefinition |
| Seed | DONE | delete+recreate pattern per Rule 12; 1 KB + 10 categories + 15 entries for first tenant, 9 permissions, vector column + HNSW index |
| Config | DONE | 8 configSchema keys (EMBEDDING_MODEL, SEARCH_CONFIDENCE_THRESHOLD, etc.) |
| Chat Block | DONE | description, capabilities, 3 actionSchemas |
| Dashboard UI | DONE | 14 components: KBPlayground (unified search/bulk/stats), KnowledgeBaseList/Create/Edit, CategoryList/Create/Edit, EntryList/Create/Edit/Show |

### Multi-KB Architecture
- `kb_knowledge_bases` table: tenants can own multiple knowledge bases
- `knowledgeBaseId` FK on categories and entries for scoping
- `tags` text array field on entries for user-facing categorization

### Integration with module-ai
- Direct import: `aiEmbed`, `aiEmbedMany` from `@oven/module-ai`
- Config reads: `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` via cascade
- Vector storage: pgvector column on kb_entries.embedding

### Known Issue
- Tool name mismatch: KB module defines `kb.search` but agent-core/chat/workflow-agents docs use `kb.searchEntries`. Must standardize to `kb.searchEntries`.

---

## 3. module-agent-core — Phase 3 BACKEND COMPLETE

**Package**: `packages/module-agent-core/`
**Spec**: `docs/modules/10-agent-core.md`
**Dependencies**: module-registry, module-roles, module-ai

| Area | Status | Details |
|------|--------|---------|
| Schema | DONE | 6 tables: agents, agent_versions, agent_node_definitions, agent_sessions, agent_messages, agent_executions |
| Engine | DONE | 3 components: tool-wrapper.ts, agent-invoker.ts, session-manager.ts |
| API Handlers | DONE | 11 files, 22 endpoints. Key: POST /api/agents/[id]/invoke |
| Tests | DONE | 15 tests / 2 suites passing (tool-wrapper, session-manager) |
| Events | DONE | 13 events with typed schemas |
| Seed | DONE | 10 permissions, 6 built-in node definitions |
| Config | DONE | 4 configSchema keys |
| Chat Block | DONE | description, capabilities, 3 actionSchemas |
| Dashboard UI | PARTIAL | Default React Admin views functional; custom UI pending (tabbed forms, ToolBindingsEditor) |

### Engine Components
1. **tool-wrapper.ts** — Registry discovery, tool spec generation, permission-filtered execution
2. **session-manager.ts** — Session CRUD, message append, history retrieval
3. **agent-invoker.ts** — Agent loading, param merging, AI SDK integration, execution recording

### Phase 3 Remaining Work
| Item | Priority | Description |
|------|----------|-------------|
| agent-invoker tests | MEDIUM | No test suite for the invocation flow |
| Integration tests | LOW | End-to-end invoke → tool call → response |
| Custom dashboard UI | MEDIUM | Tabbed agent edit form, ToolBindingsEditor component, playground tab |
| Stream handling verification | MEDIUM | Verify SSE streaming through invoke endpoint |

---

## 4. module-chat — Phase 4A NEXT

**Package**: `packages/module-chat/` (to create)
**Spec**: `docs/modules/08-chat.md` + `docs/modules/chat/*.md`
**Dependencies**: module-registry, module-agent-core, module-ai

| Area | Status | Details |
|------|--------|---------|
| Schema | NOT STARTED | 7 tables: chat_sessions, chat_messages, chat_commands, chat_skills, chat_hooks, chat_mcp_connections, chat_feedback |
| Engine | NOT STARTED | 9 components: chat-service, command-registry, skill-loader, hook-manager, prompt-builder, context-manager, streaming-handler, mcp-connector, capability-discovery |
| API Handlers | NOT STARTED | 9 files, 20+ endpoints |
| Tests | NOT STARTED | Target: ~166 tests / 17 suites (TDD) |
| Events | NOT STARTED | ~12 events |
| Dashboard UI | NOT STARTED | Chat interface, sessions, capability browser |

### Phase 4A Architecture (Expanded)

Incorporates patterns from two reference codebases:
- **Newsan Dashboard** — Enterprise chat UI patterns (sessions, messages, filters, theming)
- **Claude Code** — Command system, skill system, hook system, MCP integration, prompt engineering

#### New Subsystems (not in original spec)
1. **Command System** — 15 built-in `/slash` commands (help, clear, agent, tools, search, mode, export, status, feedback, reset, model, temperature, skill, mcp, pin)
2. **Skill System** — 6 built-in skills (summarize, translate, extract, analyze, faq-create, report) + custom per-tenant + MCP-provided
3. **Hook System** — 8 lifecycle events (pre-message, post-message, pre-tool-use, post-tool-use, on-error, on-escalation, session-start, session-end)
4. **MCP Integration** — Connect external MCP servers, discover tools, bridge into agent tool catalog
5. **Prompt Builder** — Dynamic system prompt assembly with section caching (static/dynamic boundary)

### Sprint Plan

| Sprint | Focus | Tests Target | Duration |
|--------|-------|-------------|----------|
| 4A.1 | Schema + Engine Core | ~75 tests / 7 suites | 2 weeks |
| 4A.2 | API Handlers | ~40 tests / 6 suites | 1 week |
| 4A.3 | MCP Integration | ~30 tests / 4 suites | 1 week |
| 4A.4 | Built-in Commands + Skills | ~21 tests | 1 week |

---

## 5. agent-ui — Phase 4B NEXT (Parallel with 4A)

**Package**: `packages/agent-ui/` (to create)
**Spec**: `docs/modules/16-agent-ui.md`
**Type**: Editor package (NO ModuleDefinition — pure UI components)
**Dependencies**: module-chat (API), module-agent-core (API), @ai-sdk/react

| Area | Status | Details |
|------|--------|---------|
| ChatWidget | NOT STARTED | Embeddable floating chat with themes, quick replies, command palette, business hours |
| AgentPlayground | NOT STARTED | Testing interface with agent selector, param panel, tool call cards |
| ConversationView | NOT STARTED | Read-only message history viewer |
| Session Management | NOT STARTED | Sidebar with search, pin, preview; localStorage persistence with TTL |
| Theming | NOT STARTED | 15+ theme presets, CSS custom properties, per-tenant branding |
| Widget Bundle | NOT STARTED | Standalone JS for external embedding (Vite) |
| Layout | NOT STARTED | Resizable split/modal/fullscreen modes |
| Tests | NOT STARTED | Target: ~24 tests / 3 suites |

### Sprint Plan

| Sprint | Focus | Duration |
|--------|-------|----------|
| 4B.1 | Core components (ChatWidget, ChatInput, ChatMessage, MessageList, StreamingText, CommandPalette) | 2 weeks |
| 4B.2 | Session management (sidebar, persistence, switching, hooks) | 1 week |
| 4B.3 | Advanced features (ToolCallCard, Feedback, Playground, ParamsPanel, ErrorCard) | 2 weeks |
| 4B.4 | Theming + embedding (CSS vars, dark mode, tenant branding, widget bundle) | 1 week |
| 4B.5 | Layout + integration (resizable panels, dashboard pages, portal, mobile) | 2 weeks |

---

## 6. module-workflow-agents — Phase 5 FUTURE

**Package**: `packages/module-workflow-agents/` (to create)
**Spec**: `docs/modules/11-workflow-agents.md`
**Dependencies**: module-workflows, module-agent-core, module-ai

| Area | Status | Details |
|------|--------|---------|
| Schema | NOT STARTED | 6 tables: agent_workflows, agent_workflow_versions, agent_workflow_executions, agent_workflow_node_executions, agent_memory, mcp_server_definitions |
| Engine | NOT STARTED | Extends WorkflowEngine with 11 agent node types (agent.llm, agent.toolExecutor, agent.toolLoop, agent.rag, agent.imageGen, agent.embed, agent.memory.read, agent.memory.write, agent.humanReview, agent.subagent, agent.prompt) |
| API Handlers | NOT STARTED | 10+ files, 17 endpoints |
| Tests | NOT STARTED | Target: ~106 tests / 13 suites (TDD) — largest module |
| MCP Generator | NOT STARTED | Auto-generates MCP server definitions from workflows |

### Prerequisites
- agent_memory.embedding column must be uncommented with pgvector extension
- module-agent-core must be stable (Phase 3 complete)

---

## Aggregate Targets

| Module | Tables | Tests | API Routes | Phase | Status |
|--------|--------|-------|------------|-------|--------|
| module-ai | 9 | 102 | 32+ | 1 | DONE |
| module-knowledge-base | 4 | 19 | 15+ | 2 | DONE |
| module-agent-core | 6 | 15 | 22 | 3 | BACKEND DONE |
| module-chat | 7 | ~166 | 20+ | 4A | NOT STARTED |
| agent-ui | 0 | ~24 | 0 | 4B | NOT STARTED |
| module-workflow-agents | 6 | ~106 | 17 | 5 | NOT STARTED |
| **Total** | **32** | **~432** | **~106** | | |

---

## Cross-Module Event Wiring

| Event | Emitter | Consumers |
|-------|---------|-----------|
| `ai.call.completed` | module-ai | agent-core (execution tracking), workflow-agents (cost aggregation) |
| `ai.budget.exceeded` | module-ai | workflow-agents (halt execution) |
| `kb.entry.created` | knowledge-base | knowledge-base (auto-embed via listener) |
| `kb.entry.embedded` | knowledge-base | Dashboard UI (badge update) |
| `kb.search.executed` | knowledge-base | usage analytics |
| `agents.execution.completed` | agent-core | chat (display metadata), workflow-agents (subagent tracking) |
| `agents.tool.invoked` | agent-core | usage analytics |
| `chat.session.created` | chat | analytics |
| `chat.message.sent` | chat | analytics, hook triggers |
| `chat.command.executed` | chat | analytics |
| `chat.skill.invoked` | chat | analytics |
| `chat.mcp.connected` | chat | Dashboard (status update) |
| `agents-workflow.execution.paused` | workflow-agents | Dashboard (human review notification) |
| `agents-workflow.mcp.generated` | workflow-agents | Dashboard (MCP server list update) |

## REST Call Chain (Full Message Flow)

```
User sends message in ChatWidget
  → agent-ui POST /api/chat/sessions/[id]/messages
    → module-chat processes:
      1. Check for /command prefix → execute command if found
      2. Run pre-message hooks
      3. Build dynamic system prompt (agent base + tenant context + tools + commands + skills + KB + session context + MCP)
      4. Invoke backing agent via REST
    → module-agent-core POST /api/agents/[slug]/invoke
      → ToolWrapper resolves available tools from registry + MCP servers
      → module-ai POST /api/ai/generate (or /stream)
        → Vercel AI SDK → Provider API (OpenAI/Anthropic/Google)
        → middleware: quota check → input guardrails → generate → output guardrails → usage track
      → ToolWrapper → module-knowledge-base POST /api/knowledge-base/[slug]/search (if KB tool bound)
      → ToolWrapper → MCP server tools (if connected)
      → ToolWrapper → any other module API endpoint
    → Record execution in agent_executions
    → module-chat:
      5. Run post-message hooks
      6. Store messages in chat_messages
      7. Update session context
      8. Record actions in chat_feedback (if applicable)
  → Stream response back to ChatWidget via SSE
```

## Module Registration Order

```typescript
// apps/dashboard/src/lib/modules.ts
registry.register(tenantsModule);        // no deps
registry.register(rolesModule);          // depends: tenants
registry.register(subscriptionsModule);  // depends: tenants
registry.register(filesModule);          // depends: tenants
registry.register(aiModule);            // depends: registry, subscriptions
registry.register(knowledgeBaseModule);  // depends: registry, ai, tenants
registry.register(agentCoreModule);     // depends: registry, ai, roles
registry.register(chatModule);          // depends: registry, agent-core, ai  ← Phase 4A
// agent-ui has no ModuleDefinition (editor package) ← Phase 4B
// workflowAgentsModule depends: registry, workflows, agent-core, ai ← Phase 5
```

## Cross-Module Integration Checklist

- [x] module-ai exports: aiEmbed, aiEmbedMany, aiGenerateText, aiStreamText, middleware
- [x] module-knowledge-base exports: searchEngine, embeddingPipeline, schema
- [x] module-agent-core exports: invokeAgent, discoverTools, getToolsForAgent, executeTool, sessionManager
- [ ] Tool name standardization: `kb.search` → `kb.searchEntries` across all modules
- [ ] agent_memory.embedding column uncommented (Phase 5 prerequisite)
- [ ] module-chat registered in modules.ts with correct dependency order
- [ ] Route files created in apps/dashboard for all chat endpoints
- [ ] agent-ui peer dependencies configured (@ai-sdk/react, react, react-dom)
