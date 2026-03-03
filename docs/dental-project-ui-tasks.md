# Dashboard Interface Tasks — Per Module

> Every module follows the existing React Admin pattern:
> - `<Resource>` with `list`, `create`, `edit`, `show` components
> - Custom pages for editors (map editor, workflow editor pattern)
> - Menu items grouped by section in `CustomMenu.tsx`
> - Registered in `AdminApp.tsx`
>
> **Tenant scoping**: A global `<TenantSelector>` in the layout header sets the active tenant context.
> All list views filter by `tenantId`. All create/edit forms associate records with the active tenant.

---

## Global: Tenant Context Provider

**Before any module UI**, the dashboard needs a tenant context layer.

| # | Task | Component | Details |
|---|------|-----------|---------|
| G.1 | Tenant selector in header | `TenantSelector.tsx` | Dropdown in the app bar showing available tenants. Sets `activeTenantId` in React context. Admin users see all tenants; tenant members see only theirs |
| G.2 | Tenant context provider | `TenantProvider.tsx` | React context that wraps the Admin app. Provides `activeTenantId`, `activeTenant` config, and `isBusinessHours` to all child components |
| G.3 | Tenant-aware data provider | `dataProvider.ts` (modify) | Extend existing data provider to inject `tenantId` filter on `getList` and `tenantId` field on `create` calls automatically when tenant context is set |

---

## MODULE: module-auth

**Menu section**: (no section — login is outside the admin layout)

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `users` | Yes | Yes | Yes | Yes | Yes — filtered by `tenant_members` |
| `api-keys` | Yes | Yes | — | Yes | Yes — `api_keys.tenantId` |

### Custom Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | `LoginPage.tsx` | Email + password form. Outside the `<Admin>` layout (no sidebar). Redirects to dashboard on success |
| `/profile` | `ProfilePage.tsx` | Current user profile. Change password, view sessions |

### Files to Create

```
apps/dashboard/src/components/auth/
  LoginPage.tsx           — Email/password form, calls POST /api/auth/login
  ProfilePage.tsx         — User profile, password change
  UserList.tsx            — List users (filterable by tenant)
  UserCreate.tsx          — Invite user: email, name, tenant, role
  UserEdit.tsx            — Edit user details, toggle active/inactive
  UserShow.tsx            — View user details, login history
  ApiKeyList.tsx          — List API keys (masked), last used, expiry
  ApiKeyCreate.tsx        — Generate new key: name, tenant, permissions, expiry
  ApiKeyShow.tsx          — View key details (key shown once on create)
```

### Manual Admin Tasks (through this UI)
- Create admin user for each dental office
- Generate API key for WhatsApp webhook authentication
- Invite tenant members (office staff who can manage FAQ)

---

## MODULE: module-tenants

**Menu section**: `──── Tenants ────`

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `tenants` | Yes | Yes | Yes | Yes | No — this IS the tenant entity |
| `tenant-members` | — | — | — | — | Inline on tenant show/edit |

### Files to Create

```
apps/dashboard/src/components/tenants/
  TenantList.tsx          — All tenants. Columns: name, slug, enabled, member count, channels configured
  TenantCreate.tsx        — Wizard-style form (see fields below)
  TenantEdit.tsx          — Same form as create, with tabs
  TenantShow.tsx          — Overview dashboard: config summary, active channels, usage gauges, recent conversations
  TenantMembersTab.tsx    — Inline member list on show/edit: add/remove users, assign roles (owner/admin/member)
  ScheduleEditor.tsx      — Custom component: 7 rows (Mon–Sun), each with opening/closing time pickers + "closed" toggle
  ServicesTagInput.tsx    — Tag input for authorizedServices array
  PaymentMethodsInput.tsx — Tag input for paymentMethods array
  ToneSelector.tsx        — Radio group: formal / friendly / casual (with preview of sample greeting)
  ContactInfoEditor.tsx   — Grouped inputs: phone, email, WhatsApp number, emergency instructions
  WelcomeMessageEditor.tsx — Two textareas: business hours message + out-of-hours message, with variable placeholders ({businessName}, {schedule})
```

### TenantCreate / TenantEdit Form Fields

| Tab | Fields | Input Type |
|-----|--------|------------|
| **Identity** | name, slug (auto-gen from name), nit, businessName, logo (file upload) | TextInput, FileInput |
| **Schedule** | schedule (per day of week) | `<ScheduleEditor>` custom component |
| **Services** | authorizedServices, paymentMethods | `<ServicesTagInput>`, `<PaymentMethodsInput>` |
| **Communication** | tone, humanContactInfo (phone, email, WhatsApp), emergencyInstructions | `<ToneSelector>`, `<ContactInfoEditor>`, TextInput multiline |
| **Messaging** | welcomeMessageBusinessHours, welcomeMessageOutOfHours, schedulingUrl | `<WelcomeMessageEditor>`, TextInput |
| **Limits** | whatsappLimit (default 300), webLimit (default 500) | NumberInput |
| **Members** | (inline list) | `<TenantMembersTab>` |

### Manual Admin Tasks
- **Create tenant** for new dental office client (all Anexo 4 data: name, NIT, schedule, services, payments, tone, contact info, messages, limits)
- **Edit schedule** when office hours change
- **Update welcome messages** seasonally
- **Adjust limits** per commercial plan
- **Add/remove staff members** who can manage FAQ content

---

## MODULE: module-knowledge-base

**Menu section**: `──── Knowledge Base ────`

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `kb-categories` | Yes | Yes | Yes | — | Yes — `kb_categories.tenantId` |
| `kb-entries` | Yes | Yes | Yes | Yes | Yes — `kb_entries.tenantId` |

### Custom Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/knowledge-base/search-test` | `KBSearchTest.tsx` | Type a question, see matching entries with confidence scores. Uses `POST /api/knowledge-base/[tenantSlug]/search` |
| `/knowledge-base/bulk-actions` | `KBBulkActions.tsx` | Bulk import (CSV/JSON), bulk re-embed, export |

### Files to Create

```
apps/dashboard/src/components/knowledge-base/
  CategoryList.tsx        — Drag-and-drop sortable list. Columns: name, entry count, enabled
  CategoryCreate.tsx      — Name, slug, description, icon selector, order
  CategoryEdit.tsx        — Same as create
  EntryList.tsx           — Filterable by category. Columns: question (truncated), category, keywords, embedding status (✓/✗), priority, enabled
  EntryCreate.tsx         — Question (textarea), Answer (rich text or textarea), Keywords (tag input), Category (dropdown), Priority, Language
  EntryEdit.tsx           — Same as create + version history tab + embedding status indicator
  EntryShow.tsx           — Full Q&A display, keywords, embedding vector status, version history, similar entries
  KBSearchTest.tsx        — Input box + results list with scores. Side-by-side: "What the user asks" → "What the bot would answer"
  KBBulkActions.tsx       — Import CSV (question, answer, category, keywords), Export, Re-embed All button
  EmbeddingStatusBadge.tsx — Small component showing ✓ embedded / ⟳ pending / ✗ failed
```

### EntryCreate / EntryEdit Form Fields

| Field | Input Type | Notes |
|-------|------------|-------|
| question | TextInput multiline | The FAQ question in Spanish |
| answer | TextInput multiline (or RichTextInput) | The approved answer. Supports placeholders: `{businessName}`, `{schedulingUrl}`, `{contactPhone}` |
| category | ReferenceInput → kb-categories | Dropdown filtered by tenant |
| keywords | Custom tag input | Array of keyword strings for fallback matching |
| priority | NumberInput (1-10) | Higher priority entries win ties in search |
| language | SelectInput | Default: 'es'. Future: 'en' |
| enabled | BooleanInput | Toggle entry on/off without deleting |

### Manual Admin Tasks
- **Create 10 categories** for the dental office (or use seed)
- **Create 40 FAQ entries** (4 per category) — question, answer, keywords
- **Monthly updates** (~10 changes/month per proposal): edit answers, add new Q&A pairs
- **Test search** after changes to verify entries are found correctly
- **Re-embed** entries after bulk edits
- **Review embedding status** to ensure all entries have vectors

---

## MODULE: module-ai

**Menu section**: `──── AI Services ────`

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `ai-providers` | Yes | Yes | Yes | Yes | Optional — can be global or per-tenant |
| `ai-aliases` | Yes | Yes | Yes | — | No — global |
| `ai-vector-stores` | Yes | Yes | Yes | Yes | Yes — `ai_vector_stores.tenantId` |
| `ai-usage-logs` | Yes | — | — | Yes | Yes — filterable by tenant |
| `ai-budgets` | Yes | Yes | Yes | — | Yes — scope can be tenant |

### Custom Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/ai/playground` | `AIPlayground.tsx` | Test text generation, embeddings, image gen, structured output |
| `/ai/usage` | `AIUsageDashboard.tsx` | Charts: token consumption, cost by provider/model, budget utilization |
| `/ai/tools` | `AIToolCatalog.tsx` | Browse all registered AI tools, view Zod schemas, test invocations |
| `/ai/extensions` | `AIExtensions.tsx` | Install/check pgvector extension, view status |

### Files to Create

```
apps/dashboard/src/components/ai/
  ProviderList.tsx        — Columns: name, type (OpenAI/Anthropic/...), enabled, default models, rate limits
  ProviderCreate.tsx      — Type selector → API key (password field) → base URL → default models → rate limits
  ProviderEdit.tsx        — Same + "Test Connection" button
  ProviderShow.tsx        — Config summary + available models list (fetched from provider)
  AliasList.tsx           — Columns: alias name, provider, model, type
  AliasCreate.tsx         — Alias name, provider (dropdown), model ID, type, default settings
  AliasEdit.tsx           — Same as create
  VectorStoreList.tsx     — Columns: name, adapter (pgvector/pinecone/...), dimensions, embedding model, doc count
  VectorStoreCreate.tsx   — Name, adapter selector → adapter-specific config fields → embedding provider → dimensions → distance metric
  VectorStoreEdit.tsx     — Same + "Test Query" section
  VectorStoreShow.tsx     — Config + stats (document count, index size)
  UsageLogList.tsx        — Filterable by date range, user, agent, provider, tool. Columns: timestamp, tool, model, tokens, cost, status
  UsageLogShow.tsx        — Full details: input/output, timing, cost breakdown
  BudgetList.tsx          — Columns: scope, period, limit, current usage, % used (progress bar)
  BudgetCreate.tsx        — Scope (global/provider/user/agent/tenant), period, token limit, cost limit, alert threshold
  BudgetEdit.tsx          — Same as create
  AIPlayground.tsx        — Tabbed interface: Text Gen (prompt → response), Embeddings (text → vector), Image Gen, Object Gen
  AIUsageDashboard.tsx    — Recharts: line chart (tokens over time), bar chart (cost by provider), pie chart (by model), gauge (budget utilization)
  AIToolCatalog.tsx       — List of all ai.* tools with expandable schema viewer (JSON schema rendered as tree)
  AIExtensions.tsx        — Status table: extension name, installed?, version. "Install pgvector" button
```

### Manual Admin Tasks
- **Configure AI provider** (add OpenAI or Anthropic API key, set default models)
- **Create vector store** for KB embeddings (pgvector adapter, select embedding model, set dimensions)
- **Install pgvector** extension on first setup
- **Monitor usage** and costs per tenant
- **Set budgets** to control spending per tenant or globally
- **Test AI tools** in the playground before wiring them to agents

---

## MODULE: module-agent-core

**Menu section**: `──── Agents ────`

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `agents` | Yes | Yes | Yes | Yes | Yes — `agents.tenantId` (nullable for global agents) |
| `agent-nodes` | Yes | Yes | Yes | — | No — node definitions are global |
| `agent-sessions` | Yes | — | — | Yes | Yes — `agent_sessions.tenantId` |
| `agent-executions` | Yes | — | — | Yes | Yes — via session |

### Custom Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/agents/:id/playground` | `AgentPlayground.tsx` | (from `packages/agent-ui/`) Test agent with live conversation, tool call visualization |

### Files to Create

```
apps/dashboard/src/components/agents/
  AgentList.tsx           — Columns: name, slug, tenant, model, enabled, tool count, last invoked
  AgentCreate.tsx         — Tabbed form (see below)
  AgentEdit.tsx           — Same + "Open Playground" button (like WorkflowEdit's "Visual Editor" button)
  AgentShow.tsx           — Config summary + recent sessions + execution stats
  AgentNodeList.tsx       — Columns: name, category (llm/tool/condition/...), isSystem. Filter by category
  AgentNodeCreate.tsx     — Name, slug, category, description, inputs (JSON editor), outputs (JSON editor), config
  AgentNodeEdit.tsx       — Same as create (system nodes: read-only)
  SessionList.tsx         — Columns: agent, tenant, user, title, status, message count, created. Filter: agent, tenant, status
  SessionShow.tsx         — Message history (chat bubble layout), execution details per turn, context JSON viewer
  ExecutionList.tsx       — Columns: agent, session, status, tokens, latency, tools used, timestamp
  ExecutionShow.tsx       — Timeline view: each step with input/output, tool calls, token usage, timing
  SystemPromptEditor.tsx  — Monaco editor or large textarea with variable autocomplete ({businessName}, {schedule}, etc.)
  ToolBindingsEditor.tsx  — Multi-select checklist of available tools (discovered from registry), with search
  ExposedParamsEditor.tsx — Checkboxes for which LLM params the API caller can override
```

### AgentCreate / AgentEdit Form Fields

| Tab | Fields | Input Type |
|-----|--------|------------|
| **Identity** | name, slug, description, tenant (dropdown, optional) | TextInput, ReferenceInput |
| **LLM Config** | provider (dropdown), model, temperature (slider 0-2), maxTokens, topP, frequencyPenalty, presencePenalty | SelectInput, SliderInput, NumberInput |
| **System Prompt** | systemPrompt | `<SystemPromptEditor>` — large text area with variable hints |
| **Tools** | toolBindings | `<ToolBindingsEditor>` — multi-select from discovered tools |
| **Parameters** | exposedParams | `<ExposedParamsEditor>` — checkbox list |
| **Input** | inputConfig (accepted modalities: text, image, audio) | CheckboxGroupInput |
| **Advanced** | workflowAgentId (link to workflow), metadata | ReferenceInput, JsonInput |

### Manual Admin Tasks
- **Create dental FAQ agent**: set name, model, system prompt in Spanish, bind tools (kb.search, escalation)
- **Edit system prompt** to tune agent behavior, tone, safety rules
- **Configure tool bindings** — which module endpoints the agent can call
- **Review sessions** — browse patient conversations, check quality of answers
- **Monitor executions** — track token usage, latency, error rates per agent
- **Test in playground** — send messages, verify FAQ matching, guardrail behavior

---

## MODULE: module-workflow-agents

**Menu section**: `──── Agent Workflows ────`

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `agent-workflows` | Yes | Yes | Yes | Yes | No — workflows are global (agents are tenant-scoped) |
| `agent-workflow-executions` | Yes | — | — | Yes | Yes — via agent session |
| `agent-memory` | Yes | Yes | — | Yes | Yes — via agentId |
| `mcp-servers` | Yes | — | — | Yes | No — global |

### Custom Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/agent-workflows/:id/editor` | `AgentWorkflowEditorPage.tsx` | Visual graph editor (extends `workflow-editor`) with agent-specific node palette |

### Files to Create

```
apps/dashboard/src/components/agent-workflows/
  WorkflowList.tsx          — Columns: name, slug, enabled, mcpExport, node count, version, last executed
  WorkflowCreate.tsx        — Name, slug, description, agentConfig (LLM defaults), memoryConfig, guardrailConfig, mcpExport toggle
  WorkflowEdit.tsx          — Same + "Open Visual Editor" button + "Execute" button
  WorkflowShow.tsx          — Graph preview, config summary, execution history, version history
  ExecutionList.tsx          — Columns: workflow, agent, status (running/paused/completed/failed), tokens, duration, started
  ExecutionShow.tsx          — Node-by-node timeline: each node shows type, input, output, duration, status. Paused nodes show "Resume" button
  MemoryList.tsx             — Columns: agent, user, key, content (truncated), created. Filter by agent
  MemoryCreate.tsx           — Agent (dropdown), key, content (textarea)
  MemoryShow.tsx             — Full content, metadata, source session
  McpServerList.tsx          — Columns: name, workflow, status, tool count, last generated
  McpServerShow.tsx          — Tool definitions list with schemas, "Regenerate" button
  GuardrailConfigEditor.tsx  — Custom component: add/remove rules (regex pattern, keyword list, classification trigger), input vs output toggle, action (block/escalate/modify)
  AgentWorkflowEditorPage.tsx — Extends workflow editor with agent node palette
```

### GuardrailConfigEditor Fields

| Field | Input Type | Notes |
|-------|------------|-------|
| Input rules | Array of rule objects | Each: `{ type: 'keyword' | 'regex' | 'classifier', pattern: string, action: 'block' | 'escalate', message: string }` |
| Output rules | Same as input rules | Applied to agent's response before sending to user |
| Enabled | BooleanInput | Toggle guardrails on/off per workflow |

### Manual Admin Tasks
- **Create dental agent workflow** graph: tenantContext → safetyCheck → usageCheck → KB search → guardrail → LLM → end
- **Configure guardrail rules**: add clinical keyword patterns in Spanish ("dolor", "sangrado", "antibiótico", "diagnóstico", "tratamiento", "medicamento")
- **Edit workflow** via visual editor when reasoning flow needs changes
- **Review executions** — inspect node-by-node how the agent processed a conversation
- **Manage agent memory** — view what the agent remembers, delete stale entries
- **Monitor MCP servers** — verify auto-generated tool definitions

---

## MODULE: module-chat

**Menu section**: `──── Chat ────`

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `chat-sessions` | Yes | — | — | Yes | Yes — `chat_sessions.tenantId` |
| `chat-messages` | — | — | — | — | Inline on session show |
| `chat-actions` | — | — | — | — | Inline on session show |

### Custom Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/chat` | `ChatInterface.tsx` | Full-page chat UI for admin to test agents. Uses `useChat` from `@ai-sdk/react`. Agent selector dropdown |
| `/chat/sidebar` | (layout integration) | Collapsible chat panel on any dashboard page |

### Files to Create

```
apps/dashboard/src/components/chat/
  ChatSessionList.tsx     — Columns: tenant, user/anonymous, agent, title, channel (web/widget), message count, status, created. Filters: tenant, agent, status, date range
  ChatSessionShow.tsx     — Chat bubble layout: user messages (right), agent messages (left), tool call cards (expandable), metadata per message (model, tokens, latency)
  ChatInterface.tsx       — Full-page: sidebar with session list, main area with conversation. Agent selector, "New Session" button, streaming responses
  ChatSidebar.tsx         — Collapsible panel (imported in CustomLayout)
  ActionCard.tsx          — Reusable card showing: tool name, module, input params, output result, status
```

### Manual Admin Tasks
- **Monitor conversations** — browse all web chat sessions by tenant, check answer quality
- **Test agent via dashboard chat** — admin can chat with the agent directly to verify behavior
- **Review tool calls** — see what tools the agent used to generate each response
- **Identify gaps** — find sessions where the agent failed to answer (handoff=true) → need to add FAQ entries

---

## MODULE: module-notifications

**Menu section**: `──── Notifications ────`

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `notification-channels` | Yes | Yes | Yes | Yes | Yes — `notification_channels.tenantId` |
| `notification-conversations` | Yes | — | — | Yes | Yes — `notification_conversations.tenantId` |
| `notification-escalations` | Yes | — | Yes | Yes | Yes — `notification_escalations.tenantId` |

### Custom Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/notifications/usage` | `UsageDashboard.tsx` | Per-tenant, per-channel usage charts + limit gauges |

### Files to Create

```
apps/dashboard/src/components/notifications/
  ChannelList.tsx           — Columns: tenant, type (WhatsApp/Email/SMS), adapter (twilio/meta/resend), enabled, phone/email
  ChannelCreate.tsx         — Tenant (dropdown) → Channel type selector → Adapter selector → adapter-specific config (see below)
  ChannelEdit.tsx           — Same as create + "Test Connection" button
  ChannelShow.tsx           — Config summary, recent conversations, usage gauge
  ConversationList.tsx      — Columns: tenant, channel, external user (phone/email), status (active/escalated/closed), message count, last activity. Filters: tenant, channel, status
  ConversationShow.tsx      — Message thread: inbound (left), outbound (right), timestamps, delivery status icons (✓ sent, ✓✓ delivered, ✓✓ read). Escalation banner if escalated
  EscalationList.tsx        — Columns: tenant, channel, reason, user message (truncated), status (pending/resolved), created. Filter: tenant, status, reason
  EscalationEdit.tsx        — View full context + "Mark Resolved" button with resolution notes
  EscalationShow.tsx        — Full conversation context, escalation reason, user message, resolution history
  UsageDashboard.tsx        — Per-tenant: bar chart (messages this month vs limit), line chart (daily message count), table (tenant, channel, count, limit, %)
  AdapterConfigFields.tsx   — Dynamic form fields based on selected adapter:
```

### ChannelCreate / ChannelEdit — Adapter-Specific Config Fields

| Adapter | Config Fields | Input Type |
|---------|--------------|------------|
| **Twilio** (WhatsApp/SMS) | accountSid, authToken (password), phoneNumber, webhookUrl (auto-generated, read-only) | TextInput, PasswordInput |
| **Meta** (WhatsApp Cloud API) | phoneNumberId, businessAccountId, accessToken (password), webhookVerifyToken | TextInput, PasswordInput |
| **Resend** (Email) | apiKey (password), fromEmail, fromName, replyTo | TextInput, PasswordInput |

### Manual Admin Tasks
- **Configure WhatsApp channel** for a tenant: select Twilio adapter, enter account SID + auth token + phone number
- **Monitor conversations** — browse WhatsApp conversations per tenant, check response quality
- **Handle escalations** — review why escalation happened, mark resolved, note follow-up
- **Track usage** — check if a tenant is approaching their monthly limit, decide whether to increase
- **Switch adapters** — change a tenant from Twilio to Meta Cloud API when ready

---

## MODULE: module-files

**Menu section**: `──── Files ────`

### Resources

| Resource | List | Create | Edit | Show | Tenant-scoped |
|----------|------|--------|------|------|---------------|
| `files` | Yes | — | Yes | Yes | Yes — `files.tenantId` |

### Files to Create

```
apps/dashboard/src/components/files/
  FileList.tsx            — Grid/list toggle. Grid: thumbnail + name. List: name, type, size, uploaded, folder. Upload button in toolbar. Filter by folder, mimeType
  FileEdit.tsx            — Edit metadata: filename, folder, visibility. Preview (image/audio/video)
  FileShow.tsx            — Full preview, download link, metadata, usage (which modules reference this file)
  FileUploadDialog.tsx    — Drag-and-drop zone, file picker, progress bar, tenant auto-set
  FileUploadField.tsx     — Reusable form field: `<FileUploadField source="logoUrl" accept="image/*" />` — used by other module forms (e.g., tenant logo)
```

### Manual Admin Tasks
- **Upload tenant logo** (used in chat widget branding)
- **Manage media files** (future: images/audio sent in WhatsApp conversations)
- **Clean up unused files**

---

## MODULE: agent-ui (editor package)

**No menu section** — components are embedded in other modules' pages.

### Components

| Component | Used By | Description |
|-----------|---------|-------------|
| `<ChatWidget>` | External websites | Embeddable widget for dental office sites. Config via `data-*` attributes |
| `<AgentPlayground>` | module-agent-core Edit/Show | Conversational test interface. Used in agent edit page |
| `<ConversationView>` | module-chat, module-notifications | Reusable message thread renderer |

### Files to Create

```
packages/agent-ui/src/
  widget/
    ChatWidget.tsx          — Main widget component. Props: tenantSlug, theme, agentSlug, apiBaseUrl
    ChatBubble.tsx          — Single message bubble (user/assistant) with markdown rendering
    TypingIndicator.tsx     — Animated dots while agent is thinking
    WelcomeScreen.tsx       — Initial state: welcome message + quick-reply category buttons
    EscalationBanner.tsx    — Shows contact info when handoff=true
    AppointmentButton.tsx   — "Agendar cita" button → opens schedulingUrl
    WidgetLauncher.tsx      — Floating button (bottom-right) that opens/closes the widget
    embed.ts                — Embeddable entry point: reads data-* attributes, renders ChatWidget into a shadow DOM container
  playground/
    AgentPlayground.tsx     — Full playground: message list, input bar, settings panel, tool call cards
    ToolCallCard.tsx        — Expandable card showing tool name, input, output, duration
    ParamsPanel.tsx         — Sidebar: model selector, temperature slider, maxTokens (from agent.exposedParams)
  shared/
    ConversationView.tsx    — Generic message thread renderer. Props: messages[], onSendMessage, streaming
    MessageList.tsx         — Scrollable message list with auto-scroll on new messages
    MessageInput.tsx        — Text input + send button + optional file attach
    StreamingText.tsx       — Component that renders streaming tokens as they arrive
```

### Manual Admin Tasks
- **Embed widget** on dental office website: copy `<script>` tag with `data-tenant` attribute
- **Test widget** locally before giving to client
- **Test agent** in playground from dashboard

---

## Dashboard Menu Structure (after all modules)

```tsx
// CustomMenu.tsx — updated

──── Tenants ────
  Tenants

──── Knowledge Base ────
  Categories
  Entries
  Search Test

──── Agents ────
  Agents
  Node Definitions
  Sessions
  Executions

──── Agent Workflows ────
  Agent Workflows
  Workflow Executions
  Memory
  MCP Servers

──── Chat ────
  Chat                    // custom page — full chat interface
  Chat Sessions

──── Notifications ────
  Channels
  Conversations
  Escalations
  Usage                   // custom page — usage dashboard

──── AI Services ────
  Providers
  Model Aliases
  Vector Stores
  Tools                   // custom page — tool catalog
  Playground              // custom page
  Usage & Budgets

──── Files ────
  Files

──── Access Control ────  // (existing)
  Roles
  Permissions
  Hierarchy
  RLS Policies
  API Permissions
  Users                   // from module-auth
  API Keys                // from module-auth

──── System ────          // (existing)
  Modules & Events
  Extensions              // pgvector install status
```

---

## Total Interface Component Count

| Module | Resources | Custom Pages | Component Files | Manual Tasks |
|--------|-----------|-------------|-----------------|--------------|
| Global (tenant context) | — | — | 3 | — |
| module-auth | 2 | 2 | 10 | 3 |
| module-tenants | 1 (+inline members) | — | 12 | 5 |
| module-knowledge-base | 2 | 2 | 12 | 6 |
| module-ai | 5 | 4 | 22 | 6 |
| module-agent-core | 4 | 1 | 15 | 6 |
| module-workflow-agents | 4 | 1 | 13 | 6 |
| module-chat | 1 | 2 | 5 | 4 |
| module-notifications | 3 | 1 | 12 | 5 |
| module-files | 1 | — | 5 | 3 |
| agent-ui (package) | — | — | 14 | 3 |
| **TOTAL** | **23** | **13** | **123** | **47** |
