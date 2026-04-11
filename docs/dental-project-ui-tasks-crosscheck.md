# Dental Project UI Tasks -- Full Audit & Crosscheck

> Generated: 2026-03-30
> **Last Updated: 2026-04-04**
> Source: `docs/dental-project-ui-tasks.md` cross-referenced against all module prompt documents
> Scope: Every task ID from the dental UI tasks doc, verified against built modules and planned module specs

---

## Table of Contents

1. [Global: Tenant Context Provider](#global-tenant-context-provider)
2. [Existing Built Modules (DONE)](#existing-built-modules)
3. [New Modules -- Knowledge Base](#module-knowledge-base)
4. [New Modules -- AI](#module-ai)
5. [New Modules -- Agent Core](#module-agent-core)
6. [New Modules -- Chat](#module-chat)
7. [New Modules -- Workflow Agents](#module-workflow-agents)
8. [New Modules -- Agent UI](#agent-ui)
9. [New Modules -- Notifications](#module-notifications)
10. [New Modules -- Files](#module-files)
11. [Menu Structure Verification](#menu-structure-verification)
12. [Cross-Module Dependencies](#cross-module-dependencies)
13. [Gaps Analysis](#gaps-analysis)
14. [Summary](#summary)

---

## Global: Tenant Context Provider

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| G.1 | Tenant selector in header | **TODO** | Dashboard-level component. Currently handled via per-resource filter fields. |
| G.2 | Tenant context provider | **TODO** | Not yet implemented. Modules use explicit tenantId filter params. |
| G.3 | Tenant-aware data provider | **TODO** | Data provider sends tenantId as filter, not via context header. |

**Risk**: G.1-G.3 are nice-to-haves. Current workaround (per-resource ReferenceInput for tenant) works but is less elegant.

---

## Existing Built Modules (Sprint 1 — ALL DONE)

All modules below are verified complete with React Admin CRUD pages, API routes, and database schemas:

| Module | Components | Tables | Handlers | Status |
|--------|-----------|--------|----------|--------|
| module-auth | LoginPage, ProfilePage, UserList/Create/Edit/Show, ApiKeyList/Create/Show | 3 | 8 | ✅ DONE |
| module-tenants | TenantList/Create/Edit/Show, MemberTab, ScheduleEditor, ServicesTagInput, ToneSelector, etc. | 2 | 7 | ✅ DONE |
| module-config | ConfigList/Create/Edit/Show | 2 | 6 | ✅ DONE |
| module-subscriptions | BillingPlan, PlanQuota, ServiceCategory, Service, Provider, ProviderService, TenantSubscription, QuotaOverride CRUD | 6 | 12 | ✅ DONE |
| module-roles | Role, Permission, HierarchyNode, RlsPolicy, ApiPermission CRUD + rls-editor | 4 | 10 | ✅ DONE |
| module-forms + form-editor | FormList/Create/Edit/Show, Submissions, Components, GrapeJS editor | 5 | 15 | ✅ DONE |
| module-flows | FlowList/Create/Edit/Show, FlowItems, FlowReviews | 3 | 8 | ✅ DONE |
| module-ui-flows + editor | UiFlowList/Create/Edit/Show, ReactFlow editor (6 page types), Analytics | 4 | 10 | ✅ DONE |
| module-maps + map-editor | MapList/Create/Edit/Show, Pixi.js tile editor | 4 | 10 | ✅ DONE |
| module-workflows + editor | WorkflowList/Create/Edit/Show, ExecutionList/Show, ReactFlow editor | 5 | 15 | ✅ DONE |
| module-players | PlayerList/Create/Edit/Show | 1 | 2 | ✅ DONE |
| module-sessions | SessionList/Show | 1 | 3 | ✅ DONE |
| module-player-map-position | PositionList/Show, MapAssignmentList/Create/Edit/Show | 3 | 5 | ✅ DONE |
| module-registry | ModuleManager (system page) | 1 | 0 | ✅ DONE |
| oven-ui | 40+ ShadCN/Tailwind portal components | — | — | ✅ DONE |

**Gaps in existing modules**: None. All Sprint 1 modules are complete per spec.

---

## Module: Knowledge Base

**Package**: `module-knowledge-base` | **Phase**: 2 | **Status**: ✅ **IMPLEMENTED**

### Resources

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| KB.R1 | kb-knowledge-bases: List/Create/Edit | ✅ **DONE** | Multi-KB per tenant. KnowledgeBaseList, KnowledgeBaseCreate, KnowledgeBaseEdit. |
| KB.R2 | kb-categories: List/Create/Edit | ✅ **DONE** | Scoped by knowledgeBaseId. CategoryList, CategoryCreate, CategoryEdit. |
| KB.R3 | kb-entries: List/Create/Edit/Show | ✅ **DONE** | EntryList with filters (KB, category, language, tags), EntryCreate (two-column), EntryEdit (+ versions), EntryShow. |

### Custom Pages

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| KB.C1 | KB Playground | ✅ **DONE** | Unified KBPlayground: 3-panel layout (sidebar + tabs + history). Replaces separate SearchTest + BulkActions. Tenant → KB → Categories cascade. Search with score bars, entries browser, stats + re-embed. |

### Component Files

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| KB.F1 | KnowledgeBaseList.tsx | ✅ **DONE** | Name, slug, entry count chip, enabled, tenant filter |
| KB.F2 | KnowledgeBaseCreate.tsx | ✅ **DONE** | Tenant (ReferenceInput), name, slug, description, enabled |
| KB.F3 | KnowledgeBaseEdit.tsx | ✅ **DONE** | Same as create |
| KB.F4 | CategoryList.tsx | ✅ **DONE** | Filters: KB, tenant. Columns: name, slug, KB ref, entry count, order, enabled |
| KB.F5 | CategoryCreate.tsx | ✅ **DONE** | Tenant + KB (ReferenceInput), name, slug, description, icon, order |
| KB.F6 | CategoryEdit.tsx | ✅ **DONE** | Same fields |
| KB.F7 | EntryList.tsx | ✅ **DONE** | Filters: KB, tenant, category, language, search. Columns: question, KB ref, category chip, tags chips, embedding badge, priority, language |
| KB.F8 | EntryCreate.tsx | ✅ **DONE** | Two-column: Q&A left, metadata right (tags, keywords, priority, language) |
| KB.F9 | EntryEdit.tsx | ✅ **DONE** | Same + version history section + change note field |
| KB.F10 | EntryShow.tsx | ✅ **DONE** | Header badges (version, language, embedding, enabled, priority), category ref, Q&A, keywords, dates |
| KB.F11 | KBPlayground.tsx | ✅ **DONE** | 3-panel: sidebar (tenant→KB→categories→stats), main (search/entries/stats tabs), history sidebar |
| KB.F12 | EmbeddingStatusBadge.tsx | ✅ **DONE** | Chip: embedded (green), pending/processing (yellow), failed (red), none (default). Tooltip with details. |

### Manual Admin Tasks

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| KB.M1 | Create categories for dental office | ✅ **DONE** | 10 dental categories auto-seeded: Agendamiento, Horarios, Ubicación, Servicios, Pagos, etc. |
| KB.M2 | Create FAQ entries | ✅ **DONE** | 15 sample dental entries auto-seeded with keywords and priorities |
| KB.M3 | Monthly FAQ updates | ✅ **DONE** | Via EntryEdit with auto-versioning and re-embedding |
| KB.M4 | Test search | ✅ **DONE** | Via KBPlayground Search tab with score bars |
| KB.M5 | Re-embed after bulk edits | ✅ **DONE** | Via KBPlayground Stats tab re-embed button |
| KB.M6 | Review embedding status | ✅ **DONE** | Via EmbeddingStatusBadge on EntryList + KBPlayground sidebar stats |

### Additional Features (Beyond Original Spec)

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-KB per tenant | ✅ **DONE** | `kb_knowledge_bases` table. Tenant can have "Dental FAQ", "Employee Handbook", etc. |
| Tags on entries | ✅ **DONE** | `tags` JSONB field separate from search keywords. Visible in EntryList, editable in Create/Edit. |
| Hybrid search | ✅ **DONE** | Semantic (pgvector cosine) → keyword fallback (JSONB ?&#124; operator) → weighted merge |
| Version history + restore | ✅ **DONE** | Auto-snapshot on content change, version list in EntryEdit, restore endpoint |
| Delete+recreate seed | ✅ **DONE** | Idempotent per Rule 12. Clears tenant data → re-inserts fresh. |

**Gaps**: None. Module exceeds original spec with multi-KB, tags, and unified playground.

---

## Module: AI

**Package**: `module-ai` | **Phase**: 1 (Foundation) | **Status**: ✅ **IMPLEMENTED**

### Resources

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| AI.R1 | ai-providers: List/Create/Edit/Show | ✅ **DONE** | AES-256-GCM encrypted API keys, connection test endpoint |
| AI.R2 | ai-aliases: List/Create/Edit | ✅ **DONE** | Model aliases with parametersSchema |
| AI.R3 | ai-vector-stores: List/Create/Edit/Show | ✅ **DONE** | pgvector + Pinecone adapters |
| AI.R4 | ai-usage-logs: List | ✅ **DONE** | Filterable by tenant, provider, model |
| AI.R5 | ai-budgets: List/Create/Edit | ✅ **DONE** | Scope-based limits (global, tenant, agent, provider) |
| AI.R6 | ai-guardrails: List/Create | ✅ **DONE** | Keyword, regex, classifier rules |
| AI.R7 | ai-playground-executions: List/Show | ✅ **DONE** | Execution history |

### Custom Pages

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| AI.C1 | AI Playground | ✅ **DONE** | 6 tabs: Text Gen, Vision, Embeddings, Image Gen, Audio, Structured Output. History sidebar. File picker integration. |
| AI.C2 | AI Usage Dashboard | ✅ **DONE** | Usage stats page |
| AI.C3 | AI Tool Catalog | ✅ **DONE** | Expandable tool cards |
| AI.C4 | AI Extensions | ✅ **DONE** | pgvector status page |

### Component Files (20 files)

| Task ID | Status | Notes |
|---------|--------|-------|
| AI.F1-F20 | ✅ **ALL DONE** | ProviderList/Create/Edit/Show, AliasList/Create/Edit, VectorStoreList/Create/Edit/Show, UsageLogList, BudgetList/Create/Edit, GuardrailList/Create, AIPlayground (with FilePicker Browse button), AIUsageDashboard, AIToolCatalog, AIExtensions, PlaygroundExecutionList/Show |

### Manual Admin Tasks

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| AI.M1 | Configure AI provider | ✅ **DONE** | Via ProviderCreate + test connection |
| AI.M2 | Create vector store | ✅ **DONE** | Via VectorStoreCreate |
| AI.M3 | Install pgvector | ✅ **DONE** | Via seed.ts (CREATE EXTENSION IF NOT EXISTS vector) |
| AI.M4 | Monitor usage/costs | ✅ **DONE** | Via UsageLogList + UsageDashboard |
| AI.M5 | Set budgets | ✅ **DONE** | Via BudgetCreate/Edit |
| AI.M6 | Test AI tools | ✅ **DONE** | Via AIPlayground (6 tabs + history) |

### Backend Engine (7 components — ALL DONE)

| Component | Status |
|-----------|--------|
| Provider Registry (DB-first, env fallback, caching) | ✅ |
| Model Resolver (alias → provider:model → default) | ✅ |
| Middleware (quota + guardrails + usage tracking) | ✅ |
| Cost Calculator (20+ models priced) | ✅ |
| Encryption (AES-256-GCM for API keys) | ✅ |
| Guardrail Engine (keyword, regex, classifier) | ✅ |
| Usage Tracker (per-call logging, budget enforcement) | ✅ |

**Tests**: 102 passing / 10 suites

**Known Gaps** (documented in ai/use-case-compliance.md):
- Service catalog not auto-seeded (UC-7)
- Rate limiting config exists but enforcement not implemented
- Tenant-scoped provider resolution doesn't prioritize by tenantId

---

## Module: Agent Core

**Package**: `module-agent-core` | **Phase**: 3 | **Status**: ✅ **IMPLEMENTED (Backend)**

### Resources

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| AC.R1 | agents: List/Create/Edit/Show | ✅ **DONE** (default RA views) | 6 tables, CRUD handlers, auto-versioning on behavioral changes |
| AC.R2 | agent-nodes: List/Create/Edit | ✅ **DONE** (default RA views) | 6 built-in nodes seeded (LLM, Tool Executor, Condition, Transform, Human Review, Memory) |
| AC.R3 | agent-sessions: List/Show | ✅ **DONE** (default RA views) | Session + message management |
| AC.R4 | agent-executions: List/Show | ✅ **DONE** (default RA views) | Execution tracking with tokens/latency/tools |

### Backend Engine (3 components — ALL DONE)

| Component | Status | Notes |
|-----------|--------|-------|
| ToolWrapper | ✅ **DONE** | Discovers all module endpoints via registry.getAll(), reads chat.actionSchemas, caches 60s, filters by agent toolBindings (supports *, module.* patterns) |
| AgentInvoker | ✅ **DONE** | 10-step orchestration: load agent → merge exposed params → get/create session → resolve tools → call aiGenerateText → record execution → emit events |
| SessionManager | ✅ **DONE** | getOrCreateSession, appendMessage, getSessionMessages, archiveSession — all with event emission |

### API Endpoints (22 — ALL DONE)

| Route | Methods | Handler |
|-------|---------|---------|
| /api/agents | GET, POST | agents.handler.ts |
| /api/agents/[id] | GET, PUT, DELETE | agents-by-id.handler.ts |
| /api/agents/[id]/versions | GET | agent-versions.handler.ts |
| /api/agents/[slug]/invoke | POST | agents-invoke.handler.ts |
| /api/agents/tools | GET | agent-tools.handler.ts |
| /api/agent-nodes | GET, POST | agent-nodes.handler.ts |
| /api/agent-nodes/[id] | GET, PUT, DELETE | agent-nodes-by-id.handler.ts |
| /api/agent-sessions | GET, POST | agent-sessions.handler.ts |
| /api/agent-sessions/[id] | GET, DELETE | agent-sessions-by-id.handler.ts |
| /api/agent-sessions/[id]/messages | GET, POST | agent-sessions-messages.handler.ts |
| /api/agent-executions | GET | agent-executions.handler.ts |
| /api/agent-executions/[id] | GET | agent-executions-by-id.handler.ts |

### Custom UI Components

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| AC.F1-F14 | Custom Agent CRUD components | **TODO** | Using default React Admin list views. Custom forms (tabbed AgentCreate, SystemPromptEditor, ToolBindingsEditor) not yet built. |
| AC.C1 | Agent Playground | **TODO** | Depends on agent-ui package (Phase 4B) |

### Manual Admin Tasks

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| AC.M1 | Create dental FAQ agent | ✅ **DONE** (via API) | Can create via default RA form or API. Custom UI pending. |
| AC.M2 | Edit system prompt | ✅ **DONE** (via API) | PUT /api/agents/[id] with systemPrompt field |
| AC.M3 | Configure tool bindings | ✅ **DONE** (via API) | PUT /api/agents/[id] with toolBindings array |
| AC.M4 | Review sessions | ✅ **DONE** (default RA) | Via agent-sessions list + detail view |
| AC.M5 | Monitor executions | ✅ **DONE** (default RA) | Via agent-executions list + detail view |
| AC.M6 | Test in playground | **TODO** | Requires agent-ui package |

**Tests**: 15 passing / 2 suites (tool-wrapper: 9, session-manager: 6)

---

## Module: Chat

**Package**: `module-chat` | **Phase**: 4A | **Status**: ❌ **NOT STARTED**

| Task ID | Task | Status |
|---------|------|--------|
| CH.R1-R3 | chat-sessions, messages, actions CRUD | PLANNED |
| CH.C1 | ChatInterface full-page | PLANNED |
| CH.C2 | ChatSidebar collapsible panel | PLANNED |
| CH.F1-F5 | 5 component files | PLANNED |
| CH.M1-M4 | Monitor, test, review, identify gaps | PLANNED |

**Blocked by**: module-agent-core backend (✅ done) + agent-ui (❌ not started)

---

## Module: Workflow Agents

**Package**: `module-workflow-agents` | **Phase**: 5 | **Status**: ❌ **NOT STARTED**

| Task ID | Task | Status |
|---------|------|--------|
| WA.R1-R4 | Workflows, executions, memory, MCP servers CRUD | PLANNED |
| WA.C1 | Visual workflow editor (extends workflow-editor) | PLANNED |
| WA.F1-F12 | 12+ component files | PLANNED |
| WA.M1-M5 | Create, edit, execute, review, MCP tasks | PLANNED |

**Blocked by**: module-agent-core (✅ done) + module-workflows (✅ done)

---

## Agent UI

**Package**: `agent-ui` | **Phase**: 4B | **Status**: ❌ **NOT STARTED**

| Task ID | Task | Status |
|---------|------|--------|
| AU.F1 | ChatWidget (embeddable floating chat) | PLANNED |
| AU.F2 | AgentPlayground (testing interface) | PLANNED |
| AU.F3 | ConversationView (read-only history) | PLANNED |
| AU.F4 | Widget bundle (standalone JS for embedding) | PLANNED |

**Blocked by**: module-chat (❌ not started)

---

## Module: Notifications

**Package**: `module-notifications` | **Phase**: 4+ | **Status**: ❌ **NOT STARTED**

Covers WhatsApp via Twilio, email via Resend, web push. Not part of current AI module chain.

---

## Module: Files

**Package**: `module-files` | **Phase**: 1 | **Status**: ✅ **IMPLEMENTED**

| Task ID | Task | Status | Notes |
|---------|------|--------|-------|
| FI.R1 | FileList/Show | ✅ **DONE** | List view + detail view |
| FI.C1 | FileManager (full browser) | ✅ **DONE** | Browse by folder, upload, pagination |
| FI.C2 | FileUploader (drag-and-drop) | ✅ **DONE** | Compact + full mode, progress, callbacks |
| FI.C3 | FilePicker (modal dialog) | ✅ **DONE** | Browse + upload tabs, folder/MIME filtering |
| FI.C4 | FilePickerCombobox (autocomplete) | ✅ **DONE** | Search + URL paste, thumbnails, used in AI Playground |

---

## Menu Structure Verification

Current CustomMenu.tsx sections (14 total):

| Section | Items | Status |
|---------|-------|--------|
| World | tiles, tilesets, world-configs, maps | ✅ |
| Players | players, sessions, map-assignments, player-positions | ✅ |
| Automation | workflows, workflow-executions, module-configs | ✅ |
| AI Services | 8 resources + 4 custom pages + playground history | ✅ |
| Knowledge Base | kb-knowledge-bases, kb-categories, kb-entries, KB Playground | ✅ |
| **Agents** | **agents, agent-nodes, agent-sessions, agent-executions** | ✅ **NEW** |
| Files | file-manager, files | ✅ |
| Tenants | tenants, tenant-members, tenant-subscriptions | ✅ |
| Service Catalog | 5 items | ✅ |
| Flows | 3 items | ✅ |
| Forms | 3 items | ✅ |
| Portals | 2 items | ✅ |
| Access Control | 6 items + API Permissions | ✅ |
| System | Modules & Events | ✅ |

---

## Cross-Module Dependencies

```
module-registry (core) ← ALL modules
    ↓
module-ai (Phase 1 ✅) ← embeddings, LLM, usage tracking
    ↓
module-knowledge-base (Phase 2 ✅) ← FAQ storage + semantic search
    ↓
module-agent-core (Phase 3 ✅) ← agent definitions + tool wrapper + invocation
    ├── module-chat (Phase 4A ❌) ← conversational UI layer
    ├── agent-ui (Phase 4B ❌) ← embeddable widget + playground components
    └── module-workflow-agents (Phase 5 ❌) ← graph-based agent orchestration
```

---

## Gaps Analysis

### Critical (Blocking Next Phase)

| # | Gap | Severity | Status | Resolution |
|---|-----|----------|--------|------------|
| 1 | Agent Core custom UI components (tabbed forms, ToolBindingsEditor, SystemPromptEditor) | MEDIUM | TODO | Build custom React Admin components for richer agent management UX |
| 2 | Agent Playground depends on agent-ui package | HIGH | BLOCKED | Phase 4B deliverable |

### Previously Identified (Now Resolved)

| # | Gap | Was | Now |
|---|-----|-----|-----|
| 1 | KB module not built | PLANNED | ✅ DONE (exceeded spec with multi-KB + tags + KBPlayground) |
| 2 | AI module not built | PLANNED | ✅ DONE (102 tests, 32+ routes, 7 engines) |
| 3 | Agent Core not built | PLANNED | ✅ DONE (15 tests, 22 endpoints, 3 engines) |
| 4 | Files module not built | PLANNED | ✅ DONE (FileManager, FilePicker, FileUploader, FilePickerCombobox) |
| 5 | Tool name mismatch (kb.search vs kb.searchEntries) | MEDIUM | ✅ RESOLVED — using `kb.search` consistently |
| 6 | Subscriptions usage tracking prerequisite | BLOCKING | ✅ DONE — UsageMeteringService + sub_usage_records implemented |

### Remaining (Not Blocking Current Work)

| # | Gap | Severity | Notes |
|---|-----|----------|-------|
| 1 | Global tenant context provider (G.1-G.3) | LOW | Workaround: per-resource ReferenceInput filters work |
| 2 | AI rate limiting enforcement | LOW | Config exists, enforcement not implemented |
| 3 | AI service catalog auto-seeding | LOW | Services can be created manually |
| 4 | FTUE wizard for AI setup | LOW | Setup possible via individual CRUD pages |

---

## Summary

### Completion by Phase

| Phase | Module | Backend | UI | Tests | Status |
|-------|--------|---------|-----|-------|--------|
| 1 | module-ai | ✅ 9 tables, 32+ routes, 7 engines | ✅ 20 components + 4 custom pages | 102 | **COMPLETE** |
| 1 | module-files | ✅ 1 table, 4 routes | ✅ FileManager, FilePicker, FileUploader, Combobox | — | **COMPLETE** |
| 2 | module-knowledge-base | ✅ 4 tables, 15+ routes, 2 engines | ✅ 14 components + KBPlayground | 19 | **COMPLETE** |
| 3 | module-agent-core | ✅ 6 tables, 22 routes, 3 engines | ⚠️ Default RA views (custom UI pending) | 15 | **BACKEND DONE** |
| 4A | module-chat | ❌ | ❌ | — | NOT STARTED |
| 4B | agent-ui | ❌ | ❌ | — | NOT STARTED |
| 5 | module-workflow-agents | ❌ | ❌ | — | NOT STARTED |

### Test Totals

| Module | Suites | Tests |
|--------|--------|-------|
| module-ai | 10 | 102 |
| module-knowledge-base | 2 | 19 |
| module-agent-core | 2 | 15 |
| **Total** | **14** | **136** |

### What Can Be Done Today

With the current system, a dental office admin can:

1. ✅ **Set up AI providers** — Configure OpenAI/Anthropic/Google with encrypted API keys, test connections
2. ✅ **Create model aliases** — Map "fast" → gpt-4o-mini, "smart" → gpt-4o, "claude" → claude-sonnet
3. ✅ **Test AI in playground** — Text generation, vision, embeddings, image gen, audio, structured output (6 tabs)
4. ✅ **Create knowledge bases** — Multiple KBs per tenant (e.g., "Dental FAQ", "Employee Handbook")
5. ✅ **Manage FAQ categories** — 10 dental categories auto-seeded (Agendamiento, Horarios, Servicios, etc.)
6. ✅ **Create FAQ entries** — Question + answer + keywords + tags + priority + language, auto-embedded via pgvector
7. ✅ **Test KB search** — KBPlayground with semantic/keyword/hybrid search, score visualization, search history
8. ✅ **Bulk re-embed** — Force re-embedding after model changes, view coverage stats
9. ✅ **Create AI agents** — Define agents with system prompts, tool bindings, exposed parameters
10. ✅ **Invoke agents via API** — POST /api/agents/[slug]/invoke with messages, get AI response
11. ✅ **Browse agent sessions** — View conversation history and execution logs
12. ✅ **Discover tools** — GET /api/agents/tools returns all discoverable module endpoints
13. ✅ **Track AI usage** — Per-call logging with tokens, cost, latency, provider attribution
14. ✅ **Set budgets** — Spending limits per tenant/agent/provider with alert thresholds
15. ✅ **Apply guardrails** — Input/output content filtering (keyword, regex rules)
16. ✅ **Manage files** — Upload, browse, pick files for AI vision/audio tasks
17. ✅ **Configure tenants** — Full tenant management with schedule, services, contact info, welcome messages
18. ✅ **Manage billing plans** — Free/Starter/Pro plans with per-service quotas

### What's Next (Phase 4)

1. **module-chat** — Conversational UI layer: chat sessions, message routing to agents, anonymous sessions
2. **agent-ui** — Embeddable ChatWidget for tenant portals, AgentPlayground for dashboard testing
3. Custom Agent Core UI components (tabbed forms, ToolBindingsEditor, SystemPromptEditor)
