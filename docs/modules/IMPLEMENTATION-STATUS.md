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

## 4. module-chat — Phase 4A IN PROGRESS

**Package**: `packages/module-chat/`
**Spec**: `docs/modules/08-chat.md` + `docs/modules/chat/*.md`
**Dependencies**: module-registry, module-agent-core, module-ai, module-knowledge-base
**Started**: 2026-04-05

| Area | Status | Details |
|------|--------|---------|
| Schema | DONE | 8 tables: chatSessions, chatMessages, chatActions, chatCommands, chatSkills, chatHooks, chatMcpConnections, chatFeedback |
| Engine (Core) | DONE | 3 components: session-manager, message-processor (with processMessage orchestrator), streaming-handler |
| Engine (Extensions) | DONE | 6 of 6: command-registry (15 builtins + custom), skill-loader (template rendering), hook-manager (4 handler types + chain), mcp-connector (HTTP tool execution + bridging), prompt-builder (section-based + token budget), context-manager (history + truncation) |
| API Handlers | DONE | 14 handler files, 30 endpoints (7 list, 7 by-id, messages, capabilities) |
| Route Stubs | DONE | 14 dashboard route files in apps/dashboard/src/app/api/chat-*/ |
| Module Registration | DONE | chatModule registered in modules.ts after agentCoreModule |
| Tests | DONE | 90 tests / 11 suites passing (target was ~95) |
| Events | DONE | 12 events defined in ModuleDefinition with typed schemas |
| Seed | DONE | 15 built-in commands, 6 built-in skills |
| Config | DONE | 9 configSchema keys |
| Dashboard UI | NOT STARTED | CRUD pages for sessions, commands, skills, hooks, MCP, feedback |

### Phase 4A Architecture (Expanded)

Incorporates patterns from two reference codebases:
- **Newsan Dashboard** — Enterprise chat UI patterns (sessions, messages, filters, theming, composition hooks)
- **Claude Code** — Command system, skill system, hook system, MCP integration, prompt engineering, context management

#### Engine Components (9 files in `src/engine/`)
1. **session-manager.ts** — Create/resume/archive sessions, resolve backing agent (cascade: explicit > tenant config > platform default), validate access (authenticated via userId, anonymous via X-Session-Token)
2. **message-processor.ts** — Mediator pattern: validate → record user msg → assemble prompt → invoke agent-core → stream response → record assistant msg + tool actions → update context → check escalation
3. **streaming-handler.ts** — SSE adapter transforming agent stream to `token|toolCallStart|toolCallEnd|done|error` events
4. **command-registry.ts** — 15 built-in commands + DB-stored custom commands. Resolve by slug, parse arguments, execute, return CommandResult
5. **skill-loader.ts** — 6 built-in skills + DB-stored custom skills. Load, resolve, render prompt templates with `{{var}}` substitution
6. **hook-manager.ts** — 4 handler types (condition, api/webhook, event-bus, guardrail) on 8 lifecycle events. Execute in priority order with abort support
7. **mcp-connector.ts** — DB-stored MCP connections. Connect (SSE/HTTP), discover tools, bridge into agent tool catalog, execute tool calls
8. **prompt-builder.ts** — Section-based system prompt assembly with caching. Sections: base + agent instructions + tenant context + commands + skills + MCP capabilities + tools + KB context + session context + hook instructions
9. **context-manager.ts** — Token counting (approximate), sliding window, message summarization (via aiGenerateText), entity tracking in session.context JSONB

#### Reference Analysis Sources
- `docs/modules/chat/claude-code-feature-inventory.md` — Structured inventory of claude-code features with adaptation decisions
- `docs/modules/chat/newsan-patterns.md` — Reusable patterns from newsan-dashboard-fe

### Sprint Plan (Revised)

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| 4A.1 | Schema + Core Engine (session-manager, message-processor, streaming-handler) | 21 / 3 suites | DONE |
| 4A.2 | API Handlers (14 handler files + 14 dashboard route stubs + module registration) | 32 / 4 suites | DONE |
| 4A.3 | Commands + Skills + Hooks (command-registry, skill-loader, hook-manager + processMessage orchestrator) | 58 / 7 suites | DONE |
| 4A.4 | MCP Connector + Prompt Builder + Context Manager + Integration test | 90 / 11 suites | DONE |

---

## 5. agent-ui — Phase 4B COMPLETE

**Package**: `packages/agent-ui/`
**Spec**: `docs/modules/16-agent-ui.md`
**Type**: Editor Package (NO ModuleDefinition — pure UI components, Tailwind CSS + cn())
**Dependencies**: @oven/oven-ui (workspace), react-markdown (direct). Peer: react >=18, react-dom >=18
**Started**: 2026-04-05

| Area | Status | Details |
|------|--------|---------|
| Hooks | DONE | 8 hooks: useChat (composition), useTenantConfig, useBusinessHours, useAnonymousSession, useSessionPersistence, useDualStateMessages, useCommandPalette, useChatScroll |
| Shared Components | DONE | 11 components: MessageBubble, MessageList, MessageInput, StreamingText, CommandPalette, ChatErrorCard, ToolCallCard, MessageFeedback, TypingIndicator, SessionSidebar, ConversationView |
| Widget Components | DONE | 4 components: ChatWidget (facade), WidgetLauncher, WelcomeScreen, EscalationBanner |
| Playground | DONE | 2 components: AgentPlayground, ParamsPanel |
| Tests | DONE | 28 tests / 4 suites passing (useBusinessHours, useSessionPersistence, useCommandPalette, themes) |
| Layout | DONE | LayoutManager with inline/modal/fullscreen/embedded modes, resizable panels, localStorage persistence |
| Theming | DONE | 10 theme presets (light, dark, ocean, forest, sunset, corporate, minimal, neon, warm, cool) + applyTheme + overrides |
| Widget Bundle | DONE | Vite IIFE build entry (Shadow DOM, window.OvenChat.init API, data-* auto-init) |
| Dashboard Pages | DONE | 13 React Admin components: ChatSessionList/Edit, ChatCommandList/Create/Edit, ChatSkillList/Create/Edit, ChatHookList/Create, ChatMCPConnectionList/Create, ChatFeedbackList |
| Dashboard Registration | DONE | 6 Resources registered in AdminApp.tsx with MUI icons |

### Sprint Plan

| Sprint | Focus | Tests | Status |
|--------|-------|-------|--------|
| 4B.1 | Core UI: 8 hooks + 11 shared + 4 widget + 2 playground components | 18 / 3 suites | DONE |
| 4B.2 | LayoutManager + theming (10 presets) + Vite bundle + dashboard CRUD pages (13 components) + resource registration | 28 / 4 suites | DONE |

---

## 6. module-workflow-agents — Phase 5 OPERATIONALLY COMPLETE

**Package**: `packages/module-workflow-agents/`
**Spec**: `docs/modules/11-workflow-agents.md`
**Dependencies**: module-workflows, module-agent-core, module-ai, module-knowledge-base, module-chat
**Started**: 2026-04-05

| Area | Status | Details |
|------|--------|---------|
| Schema | DONE | 6 tables: agentWorkflows, agentWorkflowVersions, agentWorkflowExecutions, agentWorkflowNodeExecutions, agentMemory, mcpServerDefinitions |
| Engine (Core) | DONE | node-executor (9 node types all wired), workflow-engine (graph traversal + HITL pause) |
| Engine (Operations) | DONE | checkpoint-manager (save/load/resume + status transitions), cost-tracker (per-node + aggregate) |
| API Handlers | DONE | 10 handler files: workflows CRUD, execute, versions, executions CRUD, resume, cancel, memory, mcp-servers |
| Route Stubs | DONE | 11 dashboard route files in apps/dashboard/src/app/api/ |
| Module Registration | DONE | workflowAgentsModule registered with 4 resources, 4 menu items |
| Tests | DONE | 65 tests / 7 suites (+guardrails-evals: 7) |
| Events | DONE | 10 events (workflow.created/updated/deleted, execution.started/completed/failed/paused, node.started/completed/failed) |
| Config | DONE | 3 configSchema keys (MAX_STEPS, TIMEOUT_MS, MEMORY_ENABLED) |
| MCP Compiler | DONE | compileWorkflowToToolSchema + compileAndStoreMCP (workflow → MCP tool schema → upsert DB) |
| LangGraph Compiler | DONE | compileToLangGraph (workflow → Python StateGraph code with node functions, edges, conditional routing) |
| Dashboard UI | DONE | 5 CRUD components + Visual Editor Page (AgentWorkflowEditorPage → AgentWorkflowCanvas) |
| Dashboard Registration | DONE | 2 Resources + 1 Custom Route (`/agent-workflows/:id/editor`) in AdminApp.tsx |
| Visual Editor | DONE | `@oven/agent-workflow-editor`: React Flow canvas, 10 node types, palette, inspector, agent config, converters, drag-drop, save/execute + validation + version history + execution debug + diff viewer + 8 templates + import/export + template picker + clone API |
| Templates | DONE | 8 built-in templates (basic-chat, rag-assistant, tool-agent, approval-workflow, research-summarize, support-triage, memory-enhanced, multi-step-planner) |
| Clone/Fork | DONE | POST /api/agent-workflows/[id]/clone with provenance tracking (clonedFrom, templateSlug) |
| Import/Export | DONE | exportWorkflow → JSON blob, importWorkflow → validated parse with error/warning reporting |
| Schema Metadata | DONE | 5 new columns: category, tags, isTemplate, clonedFrom, templateSlug |
| Guardrails | DONE | Pre/post LLM guardrail checks in workflow engine (evaluateGuardrails wired), chat hook-manager guardrail handler wired, scoped guardrail bindings table + API |
| Observability | DONE | metrics-collector (getWorkflowMetrics, getNodeMetrics), API at /api/agent-workflow-metrics |
| Evaluations | DONE | eval-runner (rule-based + LLM-based scoring), agent_eval_definitions + agent_eval_runs tables, CRUD API |
| Guardrail Bindings | DONE | agent_guardrail_bindings table with scopeType (agent/workflow/node), GET/POST/DELETE API |
| Unified Playground | DONE | `UnifiedAIPlayground` with tabbed right panel (Inspector/Eval/Trace), target selector, runtime config, dashboard route `/ai-playground` |
| Promptfoo Integration | DONE | `promptfoo-adapter.ts`: compile target → eval config, run evals, normalize results. API at `/api/agent-eval-promptfoo`. EvalReportPanel in playground. |
| LangSmith Tracing | DONE | `langsmith-tracer.ts`: subscribes to eventBus, maps execution/node events → LangSmith runs. Opt-in via LANGSMITH_API_KEY. TracePanel in playground with link-out. |

### Node Types Implemented

| Node | Slug | Category | Status |
|------|------|----------|--------|
| LLM | `llm` | llm | DONE — calls module-ai aiGenerateText |
| Tool Executor | `tool-executor` | tool | DONE — wired to discoverTools() + executeTool() from module-agent-core |
| Condition | `condition` | condition | DONE — evaluates guards (==, !=, >, <, exists) |
| Transform | `transform` | transform | DONE — $.path mapping with dual format support |
| Memory | `memory` | memory | DONE — write: aiEmbed() + INSERT agent_memory; read: key/content search |
| Human Review | `human-review` | human-in-the-loop | DONE — pause/resume pattern |
| RAG | `rag` | retrieval | DONE — wired to hybridSearch() from module-knowledge-base |
| Subagent | `subagent` | orchestration | DONE — wired to invokeAgent() from module-agent-core |
| Prompt Assembly | `prompt` | prompt | DONE — {{var}} template rendering |

### Gap Analysis (Docs vs Implementation)

**Implemented (matches docs):**
- 6 DB tables with correct structure
- 9 node types all wired to real modules
- Graph execution engine with state accumulation
- MCP tool schema compilation
- LangGraph Python code generation
- CRUD API for workflows + executions
- Dashboard CRUD + tabbed edit form

**Closed gaps (Phase 5A.2):**
- ✅ API: resume, cancel, versions, memory, mcp-servers endpoints added (now 14 of 18)
- ✅ Engine: CheckpointManager with save/load/resume + valid status transitions
- ✅ Engine: CostTracker with per-node recording + aggregate summaries
- ✅ Events: Added 5 new events (resumed, cancelled, checkpoint.saved, human_review.pending, cost.updated) — now 15 total
- ✅ Human-review: Engine pauses on human-review nodes, saves checkpoint, emits pending event

**Remaining gaps:**
- Schema: Missing columns (mcpExport, tokenUsage, costCents on executions) — needs migration
- Config: Missing 4 of 7 config keys — low priority
- Packages: mcp-server (MCP protocol handler) and agent-runtime-py (Python sidecar) — future
- Memory: pgvector embedding column on agent_memory — needs DB extension

### Execution Engine Patterns
- Same state machine loop as module-workflows (states → invoke → context accumulation)
- $.path expression resolution for input mapping
- Guard evaluation for branching (==, !=, >, <, exists, contains, empty)
- Context accumulation: output keyed by state name, accessible via $.stateId.field
- Safety limits: maxSteps (default 50) prevents infinite loops
- Event emission at every lifecycle point (execution start/end, node start/end)

---

## Aggregate Targets

| Module | Tables | Tests | API Routes | Phase | Status |
|--------|--------|-------|------------|-------|--------|
| module-ai | 9 | 102 | 32+ | 1 | DONE |
| module-knowledge-base | 4 | 19 | 15+ | 2 | DONE |
| module-agent-core | 6 | 15 | 22 | 3 | BACKEND DONE |
| module-chat | 8 | 90 | 30 | 4A | DONE |
| agent-ui | 0 | 28 | 0 | 4B | DONE |
| module-workflow-agents | 9 | 75 | 21 | 5 | PRODUCTION READY |
| **Total** | **39** | **~273** | **~107** | | |

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
