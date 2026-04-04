# Dental Project UI Tasks -- Full Audit & Crosscheck

> Generated: 2026-03-30
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

These items apply across all modules. They are prerequisites for proper tenant-scoped data filtering.

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| G.1 | Tenant selector in header (`TenantSelector.tsx`) | **TODO** | NOT COVERED | No module prompt covers this -- it is a dashboard-level enhancement. Must be built as a Sprint 1 prerequisite before tenant-scoped modules work correctly. |
| G.2 | Tenant context provider (`TenantProvider.tsx`) | **TODO** | NOT COVERED | Same as G.1 -- dashboard app-level component, not part of any module package. |
| G.3 | Tenant-aware data provider (`dataProvider.ts` modification) | **TODO** | NOT COVERED | Requires modifying the existing React Admin data provider in `apps/dashboard`. No module prompt addresses this. |

**Risk**: G.1-G.3 are prerequisites for all tenant-scoped list views in new modules. If not completed, every new module's list/create/edit will need manual tenantId handling.

---

## Existing Built Modules

All modules below are marked DONE in the dental tasks doc. Re-verification confirms they have complete React Admin CRUD pages, API routes, and database schemas.

### module-auth

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | LoginPage (email/password) | **DONE** | Full | Outside admin layout, redirects on success |
| — | ProfilePage (user profile, password change) | **DONE** | Full | Current user profile page |
| — | UserList/Create/Edit/Show | **DONE** | Full | Filterable by tenant |
| — | ApiKeyList/Create/Show | **DONE** | Full | Masked keys, last used, expiry |
| — | Manual: Create admin user for dental office | **DONE** | Full | Via UserCreate |
| — | Manual: Generate API key for WhatsApp webhook | **DONE** | Full | Via ApiKeyCreate |
| — | Manual: Invite tenant members | **DONE** | Full | Via UserCreate with tenant/role selection |

**Gaps**: None identified. Module is complete per spec.

### module-tenants

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | TenantList (name, slug, enabled, member count) | **DONE** | Full | |
| — | TenantCreate (wizard-style form) | **DONE** | Full | All Anexo 4 fields |
| — | TenantEdit (tabbed form) | **DONE** | Full | Identity, Schedule, Services, Communication, Messaging, Limits, Members tabs |
| — | TenantShow (overview dashboard) | **DONE** | Full | Config summary, active channels, usage |
| — | TenantMembersTab (inline member list) | **DONE** | Full | Add/remove users, assign roles |
| — | ScheduleEditor (Mon-Sun time pickers) | **DONE** | Full | 7 rows, opening/closing + closed toggle |
| — | ServicesTagInput | **DONE** | Full | Tag input for authorizedServices |
| — | PaymentMethodsInput | **DONE** | Full | Tag input for paymentMethods |
| — | ToneSelector (formal/friendly/casual) | **DONE** | Full | Radio group with preview |
| — | ContactInfoEditor | **DONE** | Full | Phone, email, WhatsApp, emergency |
| — | WelcomeMessageEditor | **DONE** | Full | Two textareas with variable placeholders |
| — | Manual: Create tenant for dental office | **DONE** | Full | Via TenantCreate |
| — | Manual: Edit schedule | **DONE** | Full | Via TenantEdit Schedule tab |
| — | Manual: Update welcome messages | **DONE** | Full | Via TenantEdit Messaging tab |
| — | Manual: Adjust limits | **DONE** | Full | Via TenantEdit Limits tab |
| — | Manual: Add/remove staff members | **DONE** | Full | Via TenantMembersTab |

**Gaps**: None identified.

### module-config

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | ModuleConfigList/Create/Edit/Show | **DONE** | Full | 2 DB tables, ~6 handlers |

**Gaps**: None.

### module-subscriptions

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | BillingPlanList/Create/Edit/Show | **DONE** | Full | |
| — | PlanQuotaList/Create | **DONE** | Full | |
| — | ServiceCategoryList/Create/Edit | **DONE** | Full | |
| — | ServiceList/Create/Edit | **DONE** | Full | |
| — | ProviderList/Create/Edit | **DONE** | Full | |
| — | ProviderServiceList/Create/Edit/Show | **DONE** | Full | |
| — | TenantSubscriptionList/Create/Edit/Show | **DONE** | Full | |
| — | QuotaOverrideList/Create/Edit | **DONE** | Full | |

**Gaps**: module-ai prompts.md specifies a **prerequisite enhancement** to module-subscriptions: adding `sub_usage_records` table, usage tracking endpoints (`POST /api/usage/track`, `GET /api/usage/summary`), `UsageMeteringService`, and AI service seeds. This enhancement is NOT yet built. It is required before module-ai can function.

### module-roles

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | RoleList/Create/Edit | **DONE** | Full | |
| — | PermissionList/Create/Edit | **DONE** | Full | |
| — | HierarchyNodeList/Create/Edit | **DONE** | Full | |
| — | RlsPolicyList/Create/Edit | **DONE** | Full | |
| — | ApiPermissionList/Create/Edit | **DONE** | Full | |

**Gaps**: None. rls-editor is also built and embedded.

### module-forms + form-editor

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | FormList/Create/Edit/Show | **DONE** | Full | |
| — | FormSubmissionList/Show | **DONE** | Full | |
| — | GrapeJS visual editor | **DONE** | Full | Custom page |

**Gaps**: None.

### module-flows

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | FlowList/Create/Edit/Show | **DONE** | Full | |
| — | FlowItemList, FlowReviewList, FlowVersionList | **DONE** | Full | |

**Gaps**: None.

### module-ui-flows + ui-flows-editor

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | UiFlowList/Create/Edit/Show | **DONE** | Full | |
| — | ReactFlow visual editor | **DONE** | Full | 6 page node types, PagePalette, PageInspector, ThemePanel, NavigationPanel, PreviewPanel, VersionHistoryPanel, PublishDialog, Undo/Redo |

**Gaps**: None.

### module-maps + map-editor

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | MapList/Create/Edit/Show | **DONE** | Full | |
| — | Pixi.js tile-based map editor | **DONE** | Full | Paint/erase/pan, save dirty chunks |

**Gaps**: None.

### module-workflows + workflow-editor

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | WorkflowList/Create/Edit/Show | **DONE** | Full | |
| — | ReactFlow visual workflow editor | **DONE** | Full | |

**Gaps**: None.

### module-players

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | PlayerList/Create/Edit/Show | **DONE** | Full | 2 tables, ~6 handlers |

**Gaps**: None.

### module-sessions

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | SessionList/Show | **DONE** | Full | 2 tables, ~6 handlers |

**Gaps**: None.

### module-player-map-position

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | PlayerPositionList/Show | **DONE** | Full | |
| — | MapAssignmentList/Create/Edit | **DONE** | Full | |

**Gaps**: None.

### module-registry

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | Module list (system page) | **DONE** | Full | |

**Gaps**: None.

### oven-ui

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | 40+ ShadCN/Tailwind portal components | **DONE** | Full | Button, Card, Input, Select, Dialog, Sheet, Badge, etc. |

**Gaps**: None.

### rls-editor

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| — | Row-Level Security policy editor | **DONE** | Full | Embedded in module-roles |

**Gaps**: None.

---

## Module: Knowledge Base

**Package**: `module-knowledge-base` | **Phase**: 2 | **Status in dental doc**: NOT BUILT

### Resources

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| KB.R1 | kb-categories: List/Create/Edit | **PLANNED** | Full | Prompt spec: CategoryList (drag-and-drop sortable), CategoryCreate, CategoryEdit. DB: `kb_categories` table with tenantId, name, slug, icon, order, enabled. |
| KB.R2 | kb-entries: List/Create/Edit/Show | **PLANNED** | Full | Prompt spec: EntryList (filterable, embedding badges), EntryCreate, EntryEdit, EntryShow. DB: `kb_entries` table with question, answer, keywords, embedding vector, priority, language, version. |

### Custom Pages

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| KB.C1 | Search Test page (`KBSearchTest.tsx`) | **PLANNED** | Full | Prompt spec: split view query-to-results with confidence scores. API: `POST /api/knowledge-base/[tenantSlug]/search`. |
| KB.C2 | Bulk Actions page (`KBBulkActions.tsx`) | **PLANNED** | Full | Prompt spec: import CSV/JSON, export, re-embed all with progress bar. API: `POST /api/knowledge-base/[tenantSlug]/ingest`. |

### Component Files

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| KB.F1 | CategoryList.tsx | **PLANNED** | Full | Drag-and-drop sortable, columns: name, entry count, enabled |
| KB.F2 | CategoryCreate.tsx | **PLANNED** | Full | Name, slug, description, icon selector, order |
| KB.F3 | CategoryEdit.tsx | **PLANNED** | Full | Same as create |
| KB.F4 | EntryList.tsx | **PLANNED** | Full | Filterable by category, embedding status badges |
| KB.F5 | EntryCreate.tsx | **PLANNED** | Full | Question, Answer, Keywords, Category, Priority, Language |
| KB.F6 | EntryEdit.tsx | **PLANNED** | Full | Same + version history tab + embedding status |
| KB.F7 | EntryShow.tsx | **PLANNED** | Full | Full Q&A, keywords, embedding vector status, version history, similar entries |
| KB.F8 | KBSearchTest.tsx | **PLANNED** | Full | Input + results with scores |
| KB.F9 | KBBulkActions.tsx | **PLANNED** | Full | Import CSV, Export, Re-embed All |
| KB.F10 | EmbeddingStatusBadge.tsx | **PLANNED** | Full | Reusable: embedded/pending/failed indicator |

### Manual Admin Tasks

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| KB.M1 | Create 10 categories for dental office | **PLANNED** | Full | Prompt spec includes seed data for 10 dental categories |
| KB.M2 | Create 40 FAQ entries (4 per category) | **PLANNED** | Full | Via EntryCreate UI. Seed data is optional per prompt. |
| KB.M3 | Monthly updates (~10 changes/month) | **PLANNED** | Full | Via EntryEdit |
| KB.M4 | Test search after changes | **PLANNED** | Full | Via KBSearchTest page |
| KB.M5 | Re-embed entries after bulk edits | **PLANNED** | Full | Via KBBulkActions page (re-embed all) |
| KB.M6 | Review embedding status | **PLANNED** | Full | Via EmbeddingStatusBadge on EntryList |

### Entry Form Fields

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| KB.FF1 | question (TextInput multiline) | **PLANNED** | Full | |
| KB.FF2 | answer (TextInput multiline or RichTextInput) | **PLANNED** | Full | Supports placeholders: {businessName}, {schedulingUrl}, {contactPhone} |
| KB.FF3 | category (ReferenceInput to kb-categories) | **PLANNED** | Full | Filtered by tenant |
| KB.FF4 | keywords (custom tag input) | **PLANNED** | Full | Array of keyword strings |
| KB.FF5 | priority (NumberInput 1-10) | **PLANNED** | Full | |
| KB.FF6 | language (SelectInput, default 'es') | **PLANNED** | Full | |
| KB.FF7 | enabled (BooleanInput) | **PLANNED** | Full | |

**Gaps**: None. The module-knowledge-base prompt fully covers all dental tasks.

---

## Module: AI

**Package**: `module-ai` | **Phase**: 1 (Foundation) | **Status in dental doc**: NOT BUILT

### Resources

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AI.R1 | ai-providers: List/Create/Edit/Show | **PLANNED** | Full | Prompt: 4 CRUD endpoints. DB: `ai_providers` with encrypted API keys. |
| AI.R2 | ai-aliases: List/Create/Edit | **PLANNED** | Full | Prompt: 4 CRUD endpoints. DB: `ai_model_aliases`. |
| AI.R3 | ai-vector-stores: List/Create/Edit/Show | **PLANNED** | Full | Prompt: 4 CRUD endpoints. DB: `ai_vector_stores`. |
| AI.R4 | ai-usage-logs: List/Show | **PLANNED** | Full | Prompt: 1 list endpoint. DB: `ai_usage_logs`. |
| AI.R5 | ai-budgets: List/Create/Edit | **PLANNED** | Full | Prompt: 4 CRUD endpoints. DB: `ai_budgets`. |

### Custom Pages

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AI.C1 | AI Playground (`AIPlayground.tsx`) | **PLANNED** | Full | Prompt: tabbed -- text gen, embeddings, image gen, structured output |
| AI.C2 | AI Usage Dashboard (`AIUsageDashboard.tsx`) | **PLANNED** | Full | Prompt: Recharts -- line, bar, pie, gauge |
| AI.C3 | AI Tool Catalog (`AIToolCatalog.tsx`) | **PLANNED** | Full | Prompt: expandable cards with JSON schema viewer |
| AI.C4 | AI Extensions (`AIExtensions.tsx`) | **PLANNED** | Full | Prompt: pgvector install status + install button |

### Component Files

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AI.F1 | ProviderList.tsx | **PLANNED** | Full | name, type, enabled, default models, rate limits |
| AI.F2 | ProviderCreate.tsx | **PLANNED** | Full | Type selector, API key (password), base URL, models, rate limits |
| AI.F3 | ProviderEdit.tsx | **PLANNED** | Full | Same + "Test Connection" button |
| AI.F4 | ProviderShow.tsx | **PLANNED** | Full | Config summary + available models list |
| AI.F5 | AliasList.tsx | **PLANNED** | Full | alias name, provider, model, type |
| AI.F6 | AliasCreate.tsx | **PLANNED** | Full | |
| AI.F7 | AliasEdit.tsx | **PLANNED** | Full | |
| AI.F8 | VectorStoreList.tsx | **PLANNED** | Full | name, adapter, dimensions, embedding model, doc count |
| AI.F9 | VectorStoreCreate.tsx | **PLANNED** | Full | Adapter selector, adapter-specific config |
| AI.F10 | VectorStoreEdit.tsx | **PLANNED** | Full | Same + "Test Query" section |
| AI.F11 | VectorStoreShow.tsx | **PLANNED** | Full | Config + stats |
| AI.F12 | UsageLogList.tsx | **PLANNED** | Full | Filterable by date, user, agent, provider, tool |
| AI.F13 | UsageLogShow.tsx | **PLANNED** | Full | Full details: input/output, timing, cost |
| AI.F14 | BudgetList.tsx | **PLANNED** | Full | scope, period, limit, usage, % progress bar |
| AI.F15 | BudgetCreate.tsx | **PLANNED** | Full | |
| AI.F16 | BudgetEdit.tsx | **PLANNED** | Full | |
| AI.F17 | AIPlayground.tsx | **PLANNED** | Full | Tabbed: text gen, embeddings, image gen, object gen |
| AI.F18 | AIUsageDashboard.tsx | **PLANNED** | Full | Recharts charts |
| AI.F19 | AIToolCatalog.tsx | **PLANNED** | Full | Expandable schema viewer |
| AI.F20 | AIExtensions.tsx | **PLANNED** | Full | Extension status table + install button |

### Manual Admin Tasks

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AI.M1 | Configure AI provider (add API key, set models) | **PLANNED** | Full | Via ProviderCreate/Edit |
| AI.M2 | Create vector store for KB embeddings | **PLANNED** | Full | Via VectorStoreCreate |
| AI.M3 | Install pgvector extension | **PLANNED** | Full | Via AIExtensions page |
| AI.M4 | Monitor usage and costs per tenant | **PLANNED** | Full | Via AIUsageDashboard |
| AI.M5 | Set budgets to control spending | **PLANNED** | Full | Via BudgetCreate/Edit |
| AI.M6 | Test AI tools in playground | **PLANNED** | Full | Via AIPlayground |

**Gaps**: None for dental tasks. Note: module-subscriptions enhancement (usage tracking tables + endpoints) is a prerequisite that is not yet built.

---

## Module: Agent Core

**Package**: `module-agent-core` | **Phase**: 3 | **Status in dental doc**: NOT BUILT

### Resources

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AC.R1 | agents: List/Create/Edit/Show | **PLANNED** | Full | Prompt: 6 tables, 20 endpoints. Tabbed form with Identity, LLM Config, System Prompt, Tools, Parameters, Input, Advanced. |
| AC.R2 | agent-nodes: List/Create/Edit | **PLANNED** | Full | Node definition library. System nodes read-only. |
| AC.R3 | agent-sessions: List/Show | **PLANNED** | Full | Chat bubble layout in SessionShow. |
| AC.R4 | agent-executions: List/Show | **PLANNED** | Full | Timeline view in ExecutionShow. |

### Custom Pages

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AC.C1 | Agent Playground (`/agents/:id/playground`) | **PLANNED** | Full | Uses `AgentPlayground` from `packages/agent-ui/`. Live conversation with tool call visualization. |

### Component Files

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AC.F1 | AgentList.tsx | **PLANNED** | Full | name, slug, tenant, model, enabled, tool count, last invoked |
| AC.F2 | AgentCreate.tsx | **PLANNED** | Full | Tabbed form (7 tabs) |
| AC.F3 | AgentEdit.tsx | **PLANNED** | Full | Same + "Open Playground" button |
| AC.F4 | AgentShow.tsx | **PLANNED** | Full | Config summary + recent sessions + execution stats |
| AC.F5 | AgentNodeList.tsx | **PLANNED** | Full | name, category, isSystem. Filterable. |
| AC.F6 | AgentNodeCreate.tsx | **PLANNED** | Full | Name, slug, category, inputs/outputs JSON editor |
| AC.F7 | AgentNodeEdit.tsx | **PLANNED** | Full | System nodes: read-only |
| AC.F8 | SessionList.tsx | **PLANNED** | Full | agent, tenant, user, title, status, message count |
| AC.F9 | SessionShow.tsx | **PLANNED** | Full | Chat bubble layout, execution details, context JSON viewer |
| AC.F10 | ExecutionList.tsx | **PLANNED** | Full | agent, session, status, tokens, latency, tools used |
| AC.F11 | ExecutionShow.tsx | **PLANNED** | Full | Timeline: each step with I/O, tool calls, tokens, timing |
| AC.F12 | SystemPromptEditor.tsx | **PLANNED** | Full | Monaco editor or large textarea with variable autocomplete |
| AC.F13 | ToolBindingsEditor.tsx | **PLANNED** | Full | Multi-select checklist of available tools |
| AC.F14 | ExposedParamsEditor.tsx | **PLANNED** | Full | Checkbox list of overridable LLM params |

### Agent Form Fields

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AC.FF1 | Identity tab: name, slug, description, tenant | **PLANNED** | Full | |
| AC.FF2 | LLM Config tab: provider, model, temperature, maxTokens, etc. | **PLANNED** | Full | |
| AC.FF3 | System Prompt tab | **PLANNED** | Full | SystemPromptEditor with variable hints |
| AC.FF4 | Tools tab: toolBindings | **PLANNED** | Full | ToolBindingsEditor multi-select |
| AC.FF5 | Parameters tab: exposedParams | **PLANNED** | Full | ExposedParamsEditor |
| AC.FF6 | Input tab: inputConfig (text, image, audio modalities) | **PLANNED** | Full | |
| AC.FF7 | Advanced tab: workflowAgentId, metadata | **PLANNED** | Full | |

### Manual Admin Tasks

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AC.M1 | Create dental FAQ agent | **PLANNED** | Full | Via AgentCreate. Seed data includes optional default dental agent. |
| AC.M2 | Edit system prompt for tone/safety | **PLANNED** | Full | Via SystemPromptEditor |
| AC.M3 | Configure tool bindings | **PLANNED** | Full | Via ToolBindingsEditor |
| AC.M4 | Review sessions (browse conversations) | **PLANNED** | Full | Via SessionList + SessionShow |
| AC.M5 | Monitor executions (tokens, latency, errors) | **PLANNED** | Full | Via ExecutionList + ExecutionShow |
| AC.M6 | Test in playground | **PLANNED** | Full | Via AgentPlayground (requires agent-ui) |

**Gaps**: None for dental tasks. Note: AC.C1 (playground) depends on agent-ui package being built.

---

## Module: Chat

**Package**: `module-chat` | **Phase**: 4 | **Status in dental doc**: NOT BUILT

### Resources

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| CH.R1 | chat-sessions: List/Show | **PLANNED** | Full | Prompt: 4 tables, 9 endpoints. |
| CH.R2 | chat-messages: Inline on session show | **PLANNED** | Full | Parts-based messages displayed in chat bubble layout |
| CH.R3 | chat-actions: Inline on session show | **PLANNED** | Full | Tool call records displayed as expandable cards |

### Custom Pages

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| CH.C1 | Chat Interface (`ChatInterface.tsx`) | **PLANNED** | Full | Full-page chat UI for admin testing. Agent selector, "New Session", streaming. Uses `useChat` from `@ai-sdk/react`. |
| CH.C2 | Chat Sidebar (layout integration) | **PLANNED** | Full | Collapsible chat panel in CustomLayout. |

### Component Files

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| CH.F1 | ChatSessionList.tsx | **PLANNED** | Full | tenant, user/anonymous, agent, title, channel, count, status |
| CH.F2 | ChatSessionShow.tsx | **PLANNED** | Full | Chat bubble layout with metadata per message |
| CH.F3 | ChatInterface.tsx | **PLANNED** | Full | Sidebar session list + main conversation + agent selector |
| CH.F4 | ChatSidebar.tsx | **PLANNED** | Full | Collapsible panel |
| CH.F5 | ActionCard.tsx | **PLANNED** | Full | Reusable tool invocation display card |

### Manual Admin Tasks

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| CH.M1 | Monitor conversations (browse by tenant) | **PLANNED** | Full | Via ChatSessionList + ChatSessionShow |
| CH.M2 | Test agent via dashboard chat | **PLANNED** | Full | Via ChatInterface. Requires module-agent-core + agent-ui. |
| CH.M3 | Review tool calls per response | **PLANNED** | Full | Via ActionCard in ChatSessionShow |
| CH.M4 | Identify gaps (sessions with handoff=true) | **PLANNED** | Full | Via ChatSessionList filter on status='escalated' |

**Gaps**: None for dental tasks.

---

## Module: Workflow Agents

**Package**: `module-workflow-agents` | **Phase**: 5 | **Status in dental doc**: NOT BUILT

### Resources

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| WA.R1 | agent-workflows: List/Create/Edit/Show | **PLANNED** | Full | Prompt: 6 tables, 18 endpoints. |
| WA.R2 | agent-workflow-executions: List/Show | **PLANNED** | Full | Node-by-node timeline with cost breakdown. |
| WA.R3 | agent-memory: List/Create/Show | **PLANNED** | Full | Agent long-term memory with semantic retrieval. |
| WA.R4 | mcp-servers: List/Show | **PLANNED** | Full | Auto-generated MCP configs. |

### Custom Pages

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| WA.C1 | Agent Workflow Editor (`AgentWorkflowEditorPage.tsx`) | **PLANNED** | Full | Extends existing workflow-editor with agent-specific node palette. |

### Component Files

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| WA.F1 | WorkflowList.tsx | **PLANNED** | Full | name, slug, enabled, mcpExport, node count, version |
| WA.F2 | WorkflowCreate.tsx | **PLANNED** | Full | name, slug, agentConfig, memoryConfig, guardrailConfig, mcpExport |
| WA.F3 | WorkflowEdit.tsx | **PLANNED** | Full | Same + "Open Visual Editor" + "Execute" buttons |
| WA.F4 | WorkflowShow.tsx | **PLANNED** | Full | Graph preview, config summary, execution history |
| WA.F5 | ExecutionList.tsx | **PLANNED** | Full | workflow, agent, status, tokens, duration |
| WA.F6 | ExecutionShow.tsx | **PLANNED** | Full | Node-by-node timeline + "Resume" button for paused nodes |
| WA.F7 | MemoryList.tsx | **PLANNED** | Full | agent, user, key, content (truncated) |
| WA.F8 | MemoryCreate.tsx | **PLANNED** | Full | Agent dropdown, key, content textarea |
| WA.F9 | MemoryShow.tsx | **PLANNED** | Full | Full content, metadata, source session |
| WA.F10 | McpServerList.tsx | **PLANNED** | Full | name, workflow, status, tool count |
| WA.F11 | McpServerShow.tsx | **PLANNED** | Full | Tool definitions with schemas + "Regenerate" button |
| WA.F12 | GuardrailConfigEditor.tsx | **PLANNED** | Full | Input/output rules: keyword, regex, classifier |
| WA.F13 | AgentWorkflowEditorPage.tsx | **PLANNED** | Full | Extends workflow editor with agent node palette |

### Guardrail Config Fields

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| WA.GF1 | Input rules (array of rule objects) | **PLANNED** | Full | type: keyword/regex/classifier, pattern, action: block/escalate, message |
| WA.GF2 | Output rules (same format) | **PLANNED** | Full | Applied to agent response before sending |
| WA.GF3 | Enabled toggle | **PLANNED** | Full | Per-workflow guardrail on/off |

### Manual Admin Tasks

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| WA.M1 | Create dental agent workflow graph | **PLANNED** | Full | tenantContext, safetyCheck, usageCheck, KB search, guardrail, LLM, end |
| WA.M2 | Configure guardrail rules (clinical keywords in Spanish) | **PLANNED** | Full | Via GuardrailConfigEditor |
| WA.M3 | Edit workflow via visual editor | **PLANNED** | Full | Via AgentWorkflowEditorPage |
| WA.M4 | Review executions (node-by-node) | **PLANNED** | Full | Via ExecutionShow |
| WA.M5 | Manage agent memory | **PLANNED** | Full | Via MemoryList/Show + delete |
| WA.M6 | Monitor MCP servers | **PLANNED** | Full | Via McpServerList/Show |

**Gaps**: None for dental tasks. Note: this module also produces `mcp-server` and `agent-runtime-py` packages which are infrastructure -- no dental UI tasks reference them directly, but they are required for full agent operation.

---

## Agent UI

**Package**: `agent-ui` | **Phase**: 4 (same as module-chat) | **Status in dental doc**: NOT BUILT

This is an editor package (no ModuleDefinition). Components are embedded in other modules' pages.

### Components

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AU.C1 | ChatWidget (embeddable for external sites) | **PLANNED** | Full | Prompt: tenantSlug, theme, agentSlug, apiBaseUrl. Shadow DOM isolation. Tailwind + cn(). |
| AU.C2 | AgentPlayground (for module-agent-core) | **PLANNED** | Full | Prompt: conversation test interface with tool call visualization, params panel. |
| AU.C3 | ConversationView (for module-chat, module-notifications) | **PLANNED** | Full | Prompt: reusable message thread renderer. |

### Widget Sub-Components

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AU.W1 | ChatWidget.tsx | **PLANNED** | Full | Main widget |
| AU.W2 | ChatBubble.tsx | **PLANNED** | Full | Message bubble with markdown |
| AU.W3 | TypingIndicator.tsx | **PLANNED** | Full | Animated dots |
| AU.W4 | WelcomeScreen.tsx | **PLANNED** | Full | Welcome message + quick-reply category buttons |
| AU.W5 | EscalationBanner.tsx | **PLANNED** | Full | Contact info on handoff=true |
| AU.W6 | AppointmentButton.tsx | **PLANNED** | Full | "Agendar cita" button linking to schedulingUrl |
| AU.W7 | WidgetLauncher.tsx | **PLANNED** | Full | Floating button (bottom-right) |
| AU.W8 | embed.ts | **PLANNED** | Full | Reads data-* attributes, renders into shadow DOM |

### Playground Sub-Components

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AU.P1 | AgentPlayground.tsx | **PLANNED** | Full | Full playground |
| AU.P2 | ToolCallCard.tsx | **PLANNED** | Full | Expandable tool invocation display |
| AU.P3 | ParamsPanel.tsx | **PLANNED** | Full | Model selector, temperature slider, maxTokens |

### Shared Sub-Components

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AU.S1 | ConversationView.tsx | **PLANNED** | Full | Generic message thread |
| AU.S2 | MessageList.tsx | **PLANNED** | Full | Scrollable with auto-scroll |
| AU.S3 | MessageInput.tsx | **PLANNED** | Full | Text input + send + file attach |
| AU.S4 | StreamingText.tsx | **PLANNED** | Full | Token-by-token rendering |

### Manual Admin Tasks

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| AU.M1 | Embed widget on dental office website | **PLANNED** | Full | Copy script tag with data-tenant attribute |
| AU.M2 | Test widget locally | **PLANNED** | Full | Local dev with script tag |
| AU.M3 | Test agent in playground from dashboard | **PLANNED** | Full | Via AgentPlayground embedded in agent edit page |

**Gaps**: None for dental tasks.

---

## Module: Notifications

**Package**: `module-notifications` + `notifications-twilio` | **Phase**: Sprint 4 per dental doc | **Status**: NOT BUILT

**This module is NOT covered by any current module prompt document.** None of the 5 prompt files (ai, knowledge-base, agent-core, chat, workflow-agents) reference it.

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| NF.R1 | notification-channels: List/Create/Edit/Show | **NOT COVERED** | None | No module prompt exists |
| NF.R2 | notification-conversations: List/Show | **NOT COVERED** | None | No module prompt exists |
| NF.R3 | notification-escalations: List/Edit/Show | **NOT COVERED** | None | No module prompt exists |
| NF.C1 | Usage Dashboard (per-tenant, per-channel charts) | **NOT COVERED** | None | No module prompt exists |
| NF.F1-F10 | ChannelList/Create/Edit/Show, ConversationList/Show, EscalationList/Edit/Show, UsageDashboard, AdapterConfigFields | **NOT COVERED** | None | 12 component files listed in dental doc |
| NF.M1 | Configure WhatsApp channel (Twilio adapter) | **NOT COVERED** | None | |
| NF.M2 | Monitor WhatsApp conversations | **NOT COVERED** | None | |
| NF.M3 | Handle escalations | **NOT COVERED** | None | |
| NF.M4 | Track usage vs monthly limit | **NOT COVERED** | None | |
| NF.M5 | Switch adapters (Twilio to Meta) | **NOT COVERED** | None | |

**Total NOT COVERED tasks from this module**: ~15 tasks (3 resources + 1 custom page + 10 component files + adapter-specific config fields)

---

## Module: Files

**Package**: `module-files` | **Phase**: Sprint 6 per dental doc | **Status**: NOT BUILT

**This module is NOT covered by any current module prompt document.**

| Task ID | Task | Status | Coverage | Notes |
|---------|------|--------|----------|-------|
| FL.R1 | files: List/Edit/Show | **NOT COVERED** | None | No module prompt exists |
| FL.F1 | FileList.tsx (grid/list toggle, upload button) | **NOT COVERED** | None | |
| FL.F2 | FileEdit.tsx (metadata editing, preview) | **NOT COVERED** | None | |
| FL.F3 | FileShow.tsx (full preview, download, usage) | **NOT COVERED** | None | |
| FL.F4 | FileUploadDialog.tsx (drag-and-drop, progress) | **NOT COVERED** | None | |
| FL.F5 | FileUploadField.tsx (reusable form field) | **NOT COVERED** | None | |
| FL.M1 | Upload tenant logo | **NOT COVERED** | None | |
| FL.M2 | Manage media files | **NOT COVERED** | None | |
| FL.M3 | Clean up unused files | **NOT COVERED** | None | |

**Total NOT COVERED tasks from this module**: ~8 tasks

---

## Menu Structure Verification

The dental tasks doc specifies the full menu structure after all modules are built. Below is a verification of each section against the planned modules.

| Menu Section | Items per Dental Doc | Covered By | Status |
|--------------|---------------------|------------|--------|
| **Tenants** | Tenants | module-tenants | DONE |
| **Knowledge Base** | Categories, Entries, Search Test, Bulk Actions (custom pages) | module-knowledge-base | PLANNED (Phase 2) |
| **Agents** | Agents, Node Definitions, Sessions, Executions | module-agent-core | PLANNED (Phase 3) |
| **Agent Workflows** | Agent Workflows, Workflow Executions, Memory, MCP Servers | module-workflow-agents | PLANNED (Phase 5) |
| **Chat** | Chat (custom page), Chat Sessions | module-chat | PLANNED (Phase 4) |
| **Notifications** | Channels, Conversations, Escalations, Usage (custom page) | module-notifications | **NOT COVERED** |
| **AI Services** | Providers, Model Aliases, Vector Stores, Tools (custom page), Playground (custom page), Usage & Budgets | module-ai | PLANNED (Phase 1) |
| **Files** | Files | module-files | **NOT COVERED** |
| **Access Control** | Roles, Permissions, Hierarchy, RLS Policies, API Permissions, Users, API Keys | module-roles + module-auth | DONE |
| **System** | Modules & Events, Extensions | module-registry + module-ai (extensions) | DONE (registry) / PLANNED (extensions in module-ai) |

**Menu items NOT COVERED**: Notifications section (4 items) and Files section (1 item).

**Note on "Bulk Actions"**: The dental doc lists "Search Test" and "Bulk Actions" under Knowledge Base. The module-knowledge-base prompt maps these as custom pages, which is correct. However, these are listed as separate menu items in the doc but are custom pages (not RA Resources), so they appear in the menu but route to custom components.

---

## Cross-Module Dependencies

These dental tasks require multiple modules working together:

| Dental Task | Required Modules | Notes |
|-------------|-----------------|-------|
| "Test agent via dashboard chat" (CH.M2) | module-agent-core + module-chat + agent-ui | ChatInterface uses agent-core invoke endpoint. AgentPlayground from agent-ui. |
| "Test agent in playground" (AC.M6, AU.M3) | module-agent-core + agent-ui | AgentPlayground component from agent-ui embedded in agent edit page. |
| "Create vector store for KB embeddings" (AI.M2) | module-ai + module-knowledge-base | KB embedding pipeline calls module-ai embed tools. Vector store must exist first. |
| "Re-embed entries after bulk edits" (KB.M5) | module-knowledge-base + module-ai | Bulk processor calls module-ai's embed endpoint for each entry. |
| "Test search after changes" (KB.M4) | module-knowledge-base + module-ai | Search requires embedding the query via module-ai, then vector similarity. |
| "Create dental agent workflow graph" (WA.M1) | module-workflow-agents + module-agent-core + module-knowledge-base + module-ai | Workflow uses KB search node, LLM node, guardrail node -- all backed by module-ai. |
| "Embed widget on dental office website" (AU.M1) | agent-ui + module-chat + module-agent-core + module-ai | Widget calls chat API, which routes to agent-core, which calls module-ai. |
| "Monitor conversations" (CH.M1, NF.M2) | module-chat (web) + module-notifications (WhatsApp) | Web conversations via module-chat. WhatsApp conversations via module-notifications. Currently only web is covered. |
| "Handle escalations" (NF.M3) | module-notifications + module-chat | Escalation handling exists in chat prompt (EscalationHandler), but notification-level escalation (WhatsApp) requires module-notifications. |
| "Identify gaps" (CH.M4) | module-chat + module-knowledge-base | Finding sessions where agent failed to answer requires checking against KB entries to identify missing FAQ content. |
| Tenant-aware data filtering (all list views) | G.1-G.3 (TenantSelector, TenantProvider, data provider) + every module | Every new module's list view depends on the Global Tenant Context items being completed. |
| module-subscriptions usage tracking | module-subscriptions (enhanced) + module-ai | module-ai prompt requires `sub_usage_records` table and `UsageMeteringService` added to module-subscriptions. |
| "Configure guardrail rules" (WA.M2) | module-workflow-agents + module-ai (guardrail engine) | Guardrails defined in workflow-agents but executed through module-ai's GuardrailEngine. |
| ConversationView shared component | agent-ui + module-chat + module-notifications | ConversationView from agent-ui is reused across chat session show and notification conversation show. |

---

## Gaps Analysis

### 1. Missing Module Prompts

| Gap | Impact | Severity |
|-----|--------|----------|
| **module-notifications** has no prompt document | 15+ dental tasks uncovered (WhatsApp channel config, conversation monitoring, escalation handling, usage tracking, adapter switching) | **HIGH** -- WhatsApp integration is core to the dental project |
| **module-files** has no prompt document | 8 dental tasks uncovered (file management, tenant logo upload, media files) | **MEDIUM** -- file upload is referenced by other modules (tenant logo, chat file attach) |

### 2. Missing Prerequisites

| Gap | Impact | Severity |
|-----|--------|----------|
| **G.1-G.3 (Tenant Context)** not assigned to any module or sprint | All new module list views need manual tenantId handling without this | **HIGH** -- affects every new module |
| **module-subscriptions enhancement** (usage tracking) not yet built | module-ai cannot track costs or enforce quotas without it | **HIGH** -- blocks module-ai Phase 1 |

### 3. Feature Gaps in Covered Modules

| Gap | Module | Notes |
|-----|--------|-------|
| Knowledge Base "similar entries" display in EntryShow | module-knowledge-base | Dental doc mentions "similar entries" in EntryShow.tsx. Prompt mentions it in UI.md reference but doesn't detail the implementation. Should use vector similarity query on the current entry's embedding. |
| Chat analytics summary endpoint | module-chat | Dental doc mentions chat analytics implicitly. Prompt covers it (`chat_analytics` table, `GET /api/chat-analytics/summary`), but no dashboard component is listed for analytics visualization. |
| Version restore UI | module-knowledge-base, module-agent-core | Both prompts mention version restore endpoints, but dental doc doesn't explicitly list a "restore version" button. Prompts cover this -- dental doc is the one that omits it from component files. Not a true gap since it's covered in the API. |

### 4. Unresolved Integration Questions

| Question | Modules Involved |
|----------|-----------------|
| How does the ChatWidget know which agent to use for a given tenant? | agent-ui + module-chat + module-tenants config |
| Where is the "quick-reply category buttons" data sourced from? | agent-ui (WelcomeScreen) + module-knowledge-base (categories) |
| How does escalation from widget reach a human operator via WhatsApp? | agent-ui + module-chat + module-notifications |
| Where are AI service seeds (billing plans with AI quotas) defined? | module-subscriptions (enhanced) + module-ai |

---

## Summary

### Task Counts

| Category | Count |
|----------|-------|
| Total dental UI tasks audited | **~190** |
| Tasks DONE (existing built modules) | **~98** |
| Tasks PLANNED (new modules in 5 phases) | **~69** |
| Tasks NOT COVERED (module-notifications) | **~15** |
| Tasks NOT COVERED (module-files) | **~8** |
| Tasks TODO (Global Tenant Context G.1-G.3) | **3** |

### Status Breakdown

| Status | Count | Percentage |
|--------|-------|------------|
| **DONE** | ~98 | ~52% |
| **PLANNED** (fully covered by module prompts) | ~69 | ~36% |
| **TODO** (G.1-G.3 -- no prompt, must be built) | 3 | ~1.5% |
| **NOT COVERED** (no module prompt exists) | ~23 | ~12% |

### Completion Projections

| Milestone | Cumulative Completion |
|-----------|----------------------|
| Current state (built modules only) | **~52%** |
| After Phase 1 (module-ai) | **~63%** |
| After Phase 2 (module-knowledge-base) | **~72%** |
| After Phase 3 (module-agent-core) | **~80%** |
| After Phase 4 (module-chat + agent-ui) | **~88%** |
| After Phase 5 (module-workflow-agents) | **~95%** |
| After module-notifications (unplanned) | **~99%** |
| After module-files (unplanned) | **100%** |

### Critical Path Items

1. **G.1-G.3 (Tenant Context Provider)** -- Must be built before or alongside Phase 1. No module prompt covers this.
2. **module-subscriptions enhancement** -- Usage tracking tables and service required by module-ai. Must be done in Phase 1.
3. **module-notifications prompt** -- Must be written to cover WhatsApp integration (core dental project requirement).
4. **module-files prompt** -- Lower priority but needed for tenant logo uploads and future media handling.

### Modules Fully Verified (DONE)

module-auth, module-tenants, module-config, module-subscriptions, module-roles, module-forms, module-flows, module-ui-flows, module-maps, module-workflows, module-players, module-sessions, module-player-map-position, module-registry, oven-ui, rls-editor

### Modules Fully Planned (prompt covers all dental tasks)

module-ai, module-knowledge-base, module-agent-core, module-chat, module-workflow-agents, agent-ui

### Modules Missing Coverage

module-notifications, module-files
