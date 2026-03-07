# Dental FAQ Virtual Assistant — Project Plan

> **Status**: Sprint 1 COMPLETE — Sprint 2 next
> **Architecture**: OVEN (Next.js 15 + React Admin 5 + Drizzle ORM + Neon Postgres + Turbo + pnpm)
> **First Client**: Colombian dental office (Spanish)
> **Last updated**: 2026-03-06

---

## 1. Adapter Package Architecture

The OVEN codebase already uses an adapter/strategy pattern (see `packages/module-workflows/src/execution-strategy.ts` — `NetworkStrategy` / `DirectStrategy` with a `createStrategy()` factory). We apply this same pattern to auth, notifications, and AI providers.

### Pattern: Module + Integration Packages

```
packages/
  module-auth/                  ← Module (interface + adapter registry)
    src/
      adapters/types.ts         ← AuthAdapter interface
      adapters/registry.ts      ← Adapter registry + factory
      ...
  auth-firebase/                ← Integration package
    src/index.ts                ← implements AuthAdapter
  auth-auth0/                   ← Integration package
    src/index.ts                ← implements AuthAdapter
  auth-authjs/                  ← Integration package
    src/index.ts                ← implements AuthAdapter

  module-notifications/         ← Module (interface + adapter registry)
    src/
      adapters/types.ts         ← NotificationAdapter interface
      adapters/registry.ts      ← Adapter registry + factory
      ...
  notifications-twilio/         ← Integration package (WhatsApp + SMS)
    src/index.ts                ← implements NotificationAdapter
  notifications-resend/         ← Integration package (Email)
    src/index.ts                ← implements NotificationAdapter
  notifications-meta/           ← Integration package (WhatsApp Cloud API direct)
    src/index.ts                ← implements NotificationAdapter

  module-ai/                    ← Module (already has adapter concept for vector DBs)
    src/
      adapters/types.ts         ← VectorStoreAdapter, AIProviderAdapter interfaces
      ...
  ai-pgvector/                  ← Vector DB adapter (or inline in module-ai)

  agent-ui/                     ← Editor package (chat widget + playground)
    src/
      widget/                   ← Embeddable chat widget
      playground/               ← Agent testing playground
```

### How Adapter Selection Works

```typescript
// In module-auth/src/adapters/types.ts
export interface AuthAdapter {
  name: string;
  // Auth operations
  verifyToken(token: string): Promise<AuthUser | null>;
  createSession(user: AuthUser): Promise<SessionToken>;
  revokeSession(token: string): Promise<void>;
  // Webhook auth
  verifyApiKey(key: string): Promise<ApiKeyInfo | null>;
  // Optional: social login, MFA, etc.
  getLoginUrl?(provider: string, redirectUrl: string): string;
  handleCallback?(code: string): Promise<AuthUser>;
}

// In module-auth/src/adapters/registry.ts
const adapters = new Map<string, AuthAdapter>();
export function registerAuthAdapter(adapter: AuthAdapter) { ... }
export function getAuthAdapter(): AuthAdapter { ... }

// In auth-firebase/src/index.ts
import { type AuthAdapter, registerAuthAdapter } from '@oven/module-auth';
export const firebaseAuthAdapter: AuthAdapter = { name: 'firebase', ... };

// In apps/dashboard/src/lib/modules.ts (or a setup file)
import { firebaseAuthAdapter } from '@oven/auth-firebase';
registerAuthAdapter(firebaseAuthAdapter);
```

Same pattern for `NotificationAdapter`:

```typescript
// In module-notifications/src/adapters/types.ts
export interface NotificationAdapter {
  name: string;
  channelType: 'whatsapp' | 'sms' | 'email';
  // Send message
  sendMessage(to: string, content: MessageContent): Promise<SendResult>;
  // Webhook handling
  parseInboundWebhook(req: NextRequest): Promise<InboundMessage>;
  verifyWebhookSignature(req: NextRequest): Promise<boolean>;
  formatWebhookResponse?(message: string): NextResponse;  // e.g., TwiML for Twilio
}
```

### Adapter selection in DB

The `notification_channels` table stores which adapter to use per channel per tenant:

```sql
notification_channels (
  id, tenant_id, channel_type, adapter_name,  -- 'twilio' | 'meta' | 'resend'
  config JSONB,  -- adapter-specific config (encrypted)
  ...
)
```

When a webhook arrives, the system:
1. Identifies the tenant by phone number mapping
2. Looks up the channel config → gets `adapter_name`
3. Resolves the adapter from the registry
4. Calls `adapter.parseInboundWebhook(req)`

---

## 2. MVP Definition of Done

```
✅ Web widget responds with FAQ from the client's knowledge base
✅ WhatsApp responds with same FAQ (via Twilio — Ruta A)
✅ Urgencias/síntomas derive to human (safety rules, no LLM needed)
✅ Conversations are logged by tenant (client_id) and channel
✅ Monthly limits enforced (300 WhatsApp / 500 Web)
✅ Client can use it without developer intervention 24/7
✅ Multi-tenant architecture ready (1 client in MVP, N clients later)
```

---

## 3. MVP Architecture (adapted to OVEN)

```
Patient (Web)                         Patient (WhatsApp)
    │                                       │
    ▼                                       ▼
 <ChatWidget>                         Twilio Webhook
 (agent-ui pkg)                       (notifications-twilio pkg)
    │                                       │
    ▼                                       ▼
 POST /api/chat/sessions/[id]/messages    POST /api/notifications/whatsapp/webhook
 (module-chat)                            (module-notifications)
    │                                       │
    └───────────────┬───────────────────────┘
                    │
                    ▼
            reply(tenantId, message, channel)
            (module-agent-core invoke endpoint)
                    │
        ┌───────────┼──────────────┐
        ▼           ▼              ▼
   Safety Check   KB Search    Fallback
   (keyword        (module-      (handoff
    rules)         knowledge-    to human)
                   base)
                    │
                    ▼
              FAQ matched? ──yes──→ Return FAQ answer
                    │
                   no
                    │
                    ▼
              LLM classify? ──(optional, hook ready)──→ Generate answer
                    │
                   no match
                    │
                    ▼
              Fallback: "No tengo esa información" + handoff=true
```

### Key Design: `reply()` = Agent Invoke

Both channels call the **same agent** through `module-agent-core`'s invoke endpoint. The agent's workflow handles:
1. **Tenant context injection** (from module-tenants)
2. **Safety check** (keyword rules — no LLM needed)
3. **KB search** (module-knowledge-base — keyword + ranking in MVP, vector/embeddings later)
4. **Response generation** (FAQ match or fallback)
5. **Usage tracking** (workflow-level check via module-notifications utility)

---

## 4. Module Priority for Dental MVP

### Tier 1: Must Have (blocks everything)

| Order | Module/Package | Why First | Effort |
|-------|---------------|-----------|--------|
| 1 | module-registry EXTEND | `chat` block + `capabilities` in ModuleDefinition — all new modules need this | S |
| 2 | module-tenants | `reply()` needs `tenantId` to resolve config. Everything is tenant-scoped | M |
| 3 | module-auth + auth-authjs + auth-firebase | Dashboard needs login. Webhooks need API key verification. AuthJS for MVP, Firebase for enterprise clients | L |
| 4 | module-ai (scoped: providers + embeddings + pgvector) | KB embedding pipeline needs `ai.embed`. Provider registry for LLM hook. pgvector extension installer | L |
| 5 | module-knowledge-base | FAQ entries + search = the core product. Keyword search first, vector search as upgrade | L |
| 6 | module-agent-core (scoped: agent def + invoke + sessions) | The `reply()` engine. Unified invoke endpoint both channels call | L |

### Tier 2: Channel Delivery

| Order | Module/Package | Why | Effort |
|-------|---------------|-----|--------|
| 7 | module-chat | Web channel API (sessions, messages, streaming) | M |
| 8 | agent-ui (widget only) | Embeddable `<ChatWidget>` for dental office website | M |
| 9 | module-notifications + notifications-twilio | WhatsApp channel via Twilio. Inbound webhook + outbound messaging + usage tracking | L |

### Tier 3: Production Hardening

| Order | Module/Package | Why | Effort |
|-------|---------------|-----|--------|
| 10 | module-workflow-agents (scoped: guardrails + tool loop) | Safety guardrail nodes, agent workflow orchestration | L |
| 11 | module-files | File storage for future media messages | M |
| 12 | Full module-ai (all tools, all adapters) | Complete AI services layer | XL |

### Tier 4: Scale & Extend

| Order | Module/Package | Why | Effort |
|-------|---------------|-----|--------|
| 13 | notifications-meta | Direct WhatsApp Cloud API (cheaper long-term) | M |
| 14 | notifications-resend | Email notifications for escalations | S |
| 15 | auth-auth0 | Alternative auth adapter | M |
| 16 | Full module-workflow-agents | MCP, visual editor, memory, subagents | XL |

---

## 5. Sprint Plan (MVP — adapted to OVEN)

### Sprint 1: Foundation (Days 1–2) — ✅ COMPLETE

**Goal**: DB schema + tenants + auth + deploy skeleton

| Task | Module | Details | Status |
|------|--------|---------|--------|
| 1.1 | module-registry | Add `description`, `capabilities`, `chat` block to `ModuleDefinition` interface in `types.ts` | ✅ |
| 1.2 | module-tenants | Create package. Schema: `tenants` table + `tenant_members` + `tenant_settings`. CRUD API handlers | ✅ |
| 1.3 | module-auth | Create package + `auth-authjs` + `auth-firebase` integrations. Schema: `users`, `sessions`, `api_keys`, `password_reset_tokens`. Auth middleware. Login endpoint. API key verification | ✅ |
| 1.4 | Neon DB | Enable pgvector extension. Run Drizzle migrations | ✅ |
| 1.5 | module-forms + form-editor | 6 tables, 14 API endpoints. GrapeJS visual form editor with 40+ oven-ui ShadCN/Tailwind components | ✅ |
| 1.6 | module-flows | 8 tables, 12 API endpoints. Content approval pipeline (Draft → Review → Approved) | ✅ |
| 1.7 | Register modules | All Sprint 1 modules registered in modules.ts | ✅ |
| 1.8 | Dashboard | Full CRUD for all Sprint 1 modules + login + custom editors | ✅ |

**Additional completed beyond original plan:**

| Task | Module | Details | Status |
|------|--------|---------|--------|
| 1.9 | module-config | 5-tier config cascade (platform/module/tenant/tenant-module/instance). 2 tables, 6 handlers | ✅ |
| 1.10 | module-subscriptions | Billing plans, quotas, providers, services, overrides. 9 tables, 22 handlers | ✅ |
| 1.11 | module-roles | RBAC with hierarchy, RLS policies, API permissions. 8 tables, 18 handlers | ✅ |
| 1.12 | module-ui-flows + ui-flows-editor | Visual portal builder (ReactFlow). 6 page types, theme/nav config, publish, versions, undo/redo. 5 tables, 12 handlers | ✅ |
| 1.13 | module-maps + map-editor | Tile-based map editor (Pixi.js). 6 tables, 10 handlers | ✅ |
| 1.14 | module-workflows + workflow-editor | Visual workflow editor (ReactFlow). 5 tables, 10 handlers | ✅ |
| 1.15 | module-players + module-sessions | Player & session management. 4 tables, 12 handlers | ✅ |
| 1.16 | module-player-map-position | Player map positions & assignments. 4 tables, 6 handlers | ✅ |
| 1.17 | oven-ui | 40+ ShadCN/Tailwind portal components for form rendering | ✅ |
| 1.18 | Portal subdomain routing | Middleware + 5 page renderers (Landing, Form, FAQ, Chat, Custom) | ✅ |

**Deliverable**: ✅ Full admin dashboard with 14 modules, 67 DB tables, ~150 API handlers, 3 visual editors (forms, UI flows, maps), portal subdomain routing with 5 page types, and 40+ portal components.

### Sprint 2: Reply Engine (Days 3–5)

**Goal**: `reply()` working with FAQ search

| Task | Module | Details |
|------|--------|---------|
| 2.1 | module-knowledge-base | Create package. Schema: `kb_categories`, `kb_entries` (with `keywords JSONB`, `embedding vector(1536)` nullable), `kb_entry_versions`. CRUD API. **Keyword search first** (`keywords` array matching + text similarity). Vector search endpoint (uses module-ai when available) |
| 2.2 | module-ai (scoped) | Create package. Schema: `ai_providers`, `ai_extensions`. Provider registry (start with OpenAI). `ai.embed` tool. pgvector adapter for vector store operations. Usage tracking middleware |
| 2.3 | module-agent-core (scoped) | Create package. Schema: `agents`, `agent_sessions`, `agent_messages`, `agent_executions`. Agent definition CRUD. **Invoke endpoint** `POST /api/agents/[slug]/invoke` — the `reply()` engine. Safety rules (keyword patterns — no LLM). KB search integration. Fallback + handoff logic |
| 2.4 | Seed dental agent | Create agent definition: name="Asistente Dental", system prompt (Spanish), tool bindings to `kb.search`, safety rules config |
| 2.5 | Seed FAQ content | 10 categories + 40 entries (4 per category) in Spanish. Embed entries via module-ai |
| 2.6 | Register modules | Add module-ai, module-agent-core, module-knowledge-base to modules.ts |

**Deliverable**: `POST /api/agents/asistente-dental/invoke` returns correct FAQ answers, blocks clinical content, falls back gracefully.

### Sprint 3: Web Channel (Days 6–7)

**Goal**: Web widget working end-to-end

| Task | Module | Details |
|------|--------|---------|
| 3.1 | module-chat | Create package. Schema: `chat_sessions` (with `tenantId`, `sessionToken` for anonymous), `chat_messages`, `chat_actions`. Session creation endpoint (anonymous, tenant-scoped). Message endpoint (delegates to agent invoke, supports streaming SSE) |
| 3.2 | agent-ui (widget) | Create `packages/agent-ui/`. Build `<ChatWidget tenantSlug="..." />` using `@ai-sdk/react` `useChat` hook → `/api/chat/sessions/[id]/messages`. Welcome message (business hours aware). Quick-reply buttons for FAQ categories. Escalation display with contact info. Appointment scheduling button |
| 3.3 | Widget bundle | Vite config to produce embeddable `chat-widget.js` + `chat-widget.css`. `<script src="..." data-tenant="clinica-xyz">` |
| 3.4 | Register module-chat | Add to modules.ts |

**Deliverable**: Dental office website has working chat widget. Patient types question → gets FAQ answer or escalation.

### Sprint 4: WhatsApp Channel (Days 8–10)

**Goal**: WhatsApp working via Twilio

| Task | Module | Details |
|------|--------|---------|
| 4.1 | module-notifications | Create package. Schema: `notification_channels`, `notification_conversations`, `notification_messages`, `notification_usage`, `notification_escalations`. Adapter interface + registry. Channel CRUD API. Conversation tracking. Usage tracking (per-channel, per-tenant, monthly) |
| 4.2 | notifications-twilio | Create `packages/notifications-twilio/`. Implements `NotificationAdapter`. Parse Twilio webhook (form-urlencoded: `From`, `To`, `Body`). Verify Twilio signature. Send reply as TwiML. Map `To` number → `tenantId` via `notification_channels` |
| 4.3 | WhatsApp webhook | `GET /api/notifications/whatsapp/webhook` (Twilio verification). `POST /api/notifications/whatsapp/webhook` (inbound message → identify tenant → check usage limit → invoke agent → send reply → log everything) |
| 4.4 | Usage limit enforcement | Usage check utility: `checkUsageLimit(tenantId, channel)`. Called in the inbound webhook flow (workflow-level, endpoint doesn't know about metering business logic). When exceeded: send contact-info-only response |
| 4.5 | Escalation handling | Create escalation record. Send human contact info (from tenant config). Log reason (out-of-scope / clinical / user-requested / limit-exceeded) |
| 4.6 | Configure Twilio | Set up Twilio sandbox or real number. Configure webhook URL → `https://app.vercel.app/api/notifications/whatsapp/webhook`. Test end-to-end |
| 4.7 | Register modules | Add module-notifications to modules.ts. Register Twilio adapter |

**Deliverable**: WhatsApp works. Patient sends message → same FAQ engine → reply via Twilio. Limits enforced.

### Sprint 5: Production Hardening (Days 11–13)

| Task | Module | Details |
|------|--------|---------|
| 5.1 | module-workflow-agents (scoped) | Create package. Implement: `agent.guardrail` node (output safety checking with configurable rules), `agent.safetyCheck` node (input pre-classification), `agent.tenantContext` node (inject tenant config), `agent.toolLoop` node (ReAct cycle). Schema: `agent_workflows`, `agent_workflow_executions` |
| 5.2 | Dental agent workflow | Define the full workflow graph: `tenantContext` → `safetyCheck` → `usageCheck` → `rag` → `guardrail` → `llm` → end. With escalation branches |
| 5.3 | Dashboard: Conversations | Conversation list with message history, channel indicator, escalation status |
| 5.4 | Dashboard: Usage reports | Per-tenant usage charts, limit utilization gauges, escalation rate |
| 5.5 | Dashboard: KB management | Category ordering, entry search/filter, embedding status, search test interface |
| 5.6 | E2E tests | Web flow + WhatsApp flow + guardrails + limits + multi-tenant isolation |

**Deliverable**: Production-ready with monitoring, guardrails as workflow nodes, dashboard for client management.

### Sprint 6: Full Enterprise Modules (Days 14+)

| Task | Module | Details |
|------|--------|---------|
| 6.1 | module-files | File storage with Vercel Blob. Upload/download/manage API. Media message support |
| 6.2 | Full module-ai | All tools (image, video, speech, translate, moderate). All vector DB adapters. AI playground. Usage dashboard |
| 6.3 | Full module-workflow-agents | Memory nodes, MCP auto-generation, human-in-the-loop, subagent invocation, visual editor integration |
| 6.4 | notifications-meta | Direct WhatsApp Cloud API adapter (alternative to Twilio) |
| 6.5 | notifications-resend | Email adapter for escalation notifications to office |
| 6.6 | auth-auth0 | Auth0 adapter |
| 6.8 | Full module-agent-core | Node library, versioning, playground, multimodal input |
| 6.9 | Full module-chat | Chat sidebar, action cards, agent selector, capabilities endpoint |

---

## 6. Database Schema (MVP — Neon Postgres)

### Tables Created per Module (Sprint Order)

**Sprint 1**:
```
tenants                  -- module-tenants
tenant_members           -- module-tenants
users                    -- module-auth
auth_sessions            -- module-auth
api_keys                 -- module-auth
password_reset_tokens    -- module-auth
forms                    -- module-forms
form_versions            -- module-forms
form_components          -- module-forms
form_data_sources        -- module-forms
form_submissions         -- module-forms
flows                    -- module-flows
flow_versions            -- module-flows
flow_stages              -- module-flows
flow_items               -- module-flows
flow_transitions         -- module-flows
flow_comments            -- module-flows
flow_reviews             -- module-flows
```

**Sprint 2**:
```
ai_providers             -- module-ai
ai_extensions            -- module-ai (tracks pgvector install)
ai_usage_logs            -- module-ai
kb_categories            -- module-knowledge-base
kb_entries               -- module-knowledge-base (includes vector column)
kb_entry_versions        -- module-knowledge-base
agents                   -- module-agent-core
agent_sessions           -- module-agent-core
agent_messages           -- module-agent-core
agent_executions         -- module-agent-core
```

**Sprint 3**:
```
chat_sessions            -- module-chat
chat_messages            -- module-chat
chat_actions             -- module-chat
```

**Sprint 4**:
```
notification_channels    -- module-notifications
notification_conversations -- module-notifications
notification_messages    -- module-notifications
notification_usage       -- module-notifications
notification_escalations -- module-notifications
```

**Sprint 5**:
```
agent_workflows          -- module-workflow-agents
agent_workflow_executions -- module-workflow-agents
agent_workflow_node_executions -- module-workflow-agents
agent_memory             -- module-workflow-agents
```

---

## 7. Endpoints (MVP — 3 Essential + CRUD)

### Core Flow Endpoints

```
POST /api/agents/[slug]/invoke              -- The reply() engine (both channels)
POST /api/chat/sessions                     -- Create anonymous web session
POST /api/chat/sessions/[id]/messages       -- Web channel message (streaming SSE)
POST /api/notifications/whatsapp/webhook    -- WhatsApp inbound (Twilio)
GET  /api/notifications/whatsapp/webhook    -- Twilio webhook verification
POST /api/admin/seed                        -- Seed tenant + FAQ (protected by ADMIN_SECRET)
```

### Supporting CRUD (React Admin standard pattern)

```
/api/tenants, /api/tenants/[id]
/api/auth/login, /api/auth/me, /api/auth/logout
/api/api-keys, /api/api-keys/[id]
/api/agents, /api/agents/[id]
/api/knowledge-base/categories, /api/knowledge-base/categories/[id]
/api/knowledge-base/entries, /api/knowledge-base/entries/[id]
/api/knowledge-base/[tenantSlug]/search
/api/ai/providers, /api/ai/providers/[id]
/api/notifications/channels, /api/notifications/channels/[id]
/api/notifications/conversations
/api/notifications/usage
/api/notifications/escalations
```

---

## 8. Multi-Tenant Identification

| Channel | How `tenantId` is resolved |
|---------|---------------------------|
| **Web** | `tenantSlug` passed via widget config: `<ChatWidget tenantSlug="clinica-xyz" />`. Session creation stores `tenantId`. Or via `X-Tenant-Id` header |
| **WhatsApp** | `To` phone number from Twilio webhook → lookup in `notification_channels` table: `WHERE config->>'phoneNumber' = :toNumber` → get `tenantId` |
| **Dashboard** | User is associated with tenant via `tenant_members` table (from module-auth session) |
| **API** | API key has `tenantId` FK — resolved from `api_keys` table on key verification |

---

## 9. Reply Engine Logic (FAQ-First, LLM-Last)

```
function reply(tenantId, message, channel):
  1. Load tenant config (module-tenants)
  2. Check usage limit (module-notifications utility)
     → if exceeded: return { reply: contactInfoMessage, handoff: true, reason: 'limit_exceeded' }

  3. Normalize text (lowercase, trim, remove accents)

  4. Safety check — keyword rules (NO LLM):
     → if matches clinical pattern ("dolor", "sangrado", "antibiótico", "diagnóstico"...):
        return { reply: safeEscalationMessage, handoff: true, reason: 'clinical' }

  5. Search FAQ (module-knowledge-base):
     → MVP: keyword matching against kb_entries.keywords JSONB array
     → Later: vector similarity via module-ai embeddings
     → if strong match (score > threshold):
        return { reply: entry.answer, handoff: false }

  6. LLM classify (OPTIONAL — hook ready, not active in MVP):
     → if enabled: call module-ai generateText to classify intent
     → route to appropriate FAQ category or generate answer

  7. Fallback:
     → return { reply: "No tengo esa información. Te comunico con un asesor.", handoff: true, reason: 'no_match' }

  8. Log: save to agent_messages + agent_executions
  9. Track usage: increment notification_usage counter
```

---

## 10. Spec Files to Create/Update

### Update Existing

| File | Changes |
|------|---------|
| `docs/modules/00-overview.md` | Add module-tenants, module-auth, module-files, module-notifications, module-knowledge-base, agent-ui to module map. Add adapter package pattern section |
| `docs/modules/08-chat.md` | Add anonymous session support (sessionToken, no userId). Reference agent-ui for embeddable widget. Add tenantId to chat_sessions |
| `docs/modules/10-agent-core.md` | Add tenantId to agents and agent_sessions. Add tenant-aware invoke behavior |
| `docs/modules/11-workflow-agents.md` | Add `agent.guardrail`, `agent.safetyCheck`, `agent.tenantContext` node types. Add `guardrailConfig` to agent_workflows schema |
| `docs/modules/12-ai.md` | Add `ai_extensions` table for pgvector install tracking. Add `POST /api/ai/extensions/install` endpoint. Add multi-tenancy scoping |

### Create New

| File | Module |
|------|--------|
| `docs/modules/13-tenants.md` | module-tenants |
| `docs/modules/14-files.md` | module-files |
| `docs/modules/15-notifications.md` | module-notifications + adapter pattern |
| `docs/modules/16-agent-ui.md` | agent-ui editor package |
| `docs/modules/17-auth.md` | module-auth + adapter pattern |
| `docs/modules/18-knowledge-base.md` | module-knowledge-base |

---

## 11. E2E Test Checklist

### Web Channel
- [ ] Widget loads on dental office page with correct welcome message
- [ ] Business hours: shows business-hours welcome message
- [ ] Out of hours: shows out-of-hours welcome message
- [ ] FAQ question "¿Cuál es el horario?" → correct FAQ answer
- [ ] Clinical question "Me duele una muela" → safe escalation + handoff
- [ ] Out of scope "¿Cuánto cuesta un carro?" → fallback + handoff
- [ ] "Quiero agendar una cita" → scheduling URL
- [ ] "Quiero hablar con alguien" → human contact info
- [ ] 501st web message in month → limit exceeded response

### WhatsApp Channel
- [ ] User sends "Hola" → welcome message
- [ ] FAQ question → correct answer (same as web)
- [ ] Clinical question → safe escalation (same as web)
- [ ] 301st WhatsApp message in month → limit exceeded + contact info
- [ ] Twilio webhook signature verification works
- [ ] Conversation logged with correct tenantId and channel

### Multi-Tenant
- [ ] Configure second tenant with different config
- [ ] Verify tenant isolation (FAQ, limits, config)
- [ ] Verify different WhatsApp numbers → different tenants

### Guardrails (Sprint 5)
- [ ] agent.safetyCheck blocks "¿Qué antibiótico debo tomar?"
- [ ] agent.guardrail catches clinical content in LLM output
- [ ] Escalation record created with correct reason

---

## 12. Packages Summary

```
packages/
  ─── IMPLEMENTED (23 packages) ──────────────────────────
  module-registry/           ✅ DONE — Module registry with capabilities, chat block
  module-config/             ✅ DONE — 5-tier config cascade, 2 tables, 6 handlers
  module-tenants/            ✅ DONE — 3 tables, 8 handlers
  module-subscriptions/      ✅ DONE — Billing plans, quotas, providers, 9 tables, 22 handlers
  module-auth/               ✅ DONE — Adapter interface + middleware, 5 tables, 12 handlers
  auth-authjs/               ✅ DONE — NextAuth.js v5 adapter
  auth-firebase/             ✅ DONE — Firebase adapter
  module-roles/              ✅ DONE — RBAC, RLS, hierarchy, 8 tables, 18 handlers
  module-forms/              ✅ DONE — 6 tables, 14 endpoints
  form-editor/               ✅ DONE — GrapeJS visual editor with 40+ oven-ui components
  module-flows/              ✅ DONE — Content approval pipeline, 8 tables, 12 endpoints
  module-ui-flows/           ✅ DONE — Portal definitions, 5 tables, 12 handlers
  ui-flows-editor/           ✅ DONE — ReactFlow visual editor, 6 node types, theme/nav/preview/versions/undo-redo
  module-maps/               ✅ DONE — Tile-based maps, 6 tables, 10 handlers
  map-editor/                ✅ DONE — Pixi.js tile editor
  module-workflows/          ✅ DONE — Workflow engine, 5 tables, 10 handlers
  workflow-editor/           ✅ DONE — ReactFlow workflow editor
  module-workflow-compiler/  ✅ DONE — Workflow definition compiler
  module-players/            ✅ DONE — 2 tables, 6 handlers
  module-sessions/           ✅ DONE — 2 tables, 6 handlers
  module-player-map-position/ ✅ DONE — 4 tables, 6 handlers
  oven-ui/                   ✅ DONE — 40+ ShadCN/Tailwind portal components
  rls-editor/                ✅ DONE — RLS policy editor

  ─── NOT YET BUILT (9 packages for dental MVP) ──────────
  module-knowledge-base/     🔲 Sprint 2 — FAQ entries + search
  module-ai/                 🔲 Sprint 2 — AI providers + embeddings + pgvector
  module-agent-core/         🔲 Sprint 2 — Agent definitions + invoke engine
  module-chat/               🔲 Sprint 3 — Web chat sessions + streaming
  agent-ui/                  🔲 Sprint 3 — Chat widget + playground
  module-notifications/      🔲 Sprint 4 — Notification channels + conversations
  notifications-twilio/      🔲 Sprint 4 — Twilio WhatsApp adapter
  module-workflow-agents/    🔲 Sprint 5 — Agent workflows + guardrails + memory
  module-files/              🔲 Sprint 6 — File storage

  ─── FUTURE (not dental MVP) ────────────────────────────
  auth-auth0/                ⏳ Sprint 6+ — Auth0 adapter
  notifications-meta/        ⏳ Sprint 6+ — Direct WhatsApp Cloud API
  notifications-resend/      ⏳ Sprint 6+ — Email adapter
```

---

## 13. Critical Files Reference

### To Modify
- `packages/module-registry/src/types.ts` — ModuleDefinition interface
- `apps/dashboard/src/lib/modules.ts` — Module registration

### Pattern References
- `packages/module-workflows/src/execution-strategy.ts` — Adapter/strategy pattern
- `packages/module-workflows/src/schema.ts` — Drizzle table pattern
- `packages/module-workflows/src/index.ts` — ModuleDefinition export
- `packages/module-workflows/src/engine.ts` — Execution engine pattern
- `packages/module-workflows/src/seed.ts` — Seed function pattern
- `packages/module-workflows/src/api/*.handler.ts` — API handler pattern
- `apps/dashboard/src/app/api/tiles/upload/route.ts` — Vercel Blob upload (for module-files)
