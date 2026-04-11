# Module Chat + Agent UI — Implementation Prompt

> Condensed directive for implementing `packages/module-chat` and `packages/agent-ui`.
> References all docs in this folder. Use as baseline context for any implementation agent.

---

## Identity

### module-chat
- **Package**: `packages/module-chat`
- **Name**: `@oven/module-chat`
- **Type**: ModuleDefinition (full module)
- **Phase**: 4
- **Dependencies**: `module-registry`, `module-agent-core`, `module-ai`, `module-tenants`
- **Depended on by**: agent-ui (consumes chat API)

### agent-ui
- **Package**: `packages/agent-ui`
- **Name**: `@oven/agent-ui`
- **Type**: Editor Package (NO ModuleDefinition — pure UI components)
- **Phase**: 4 (same phase as module-chat)
- **Dependencies**: `module-chat` (API), `module-agent-core` (agent invocation), `@ai-sdk/react` (useChat hook)

## Mission

**module-chat**: Chat session management, anonymous sessions (for widget), authenticated sessions (for dashboard), message routing to agents, streaming API, escalation handling, and session analytics.

**agent-ui**: Embeddable React component library — ChatWidget (for external websites + portals), AgentPlayground (for dashboard testing), ConversationView (for reviewing past conversations). Also produces a standalone JS bundle for embedding via `<script>` tag.

## Key Constraints

- **module-chat**: MUI 7 + sx prop for dashboard components. Standard ModuleDefinition pattern.
- **agent-ui**: This is a **portal/external package** — uses Tailwind CSS + `cn()` from `@oven/oven-ui`. NOT MUI. The widget must work on external sites.
- **Styling split**: Dashboard components (in apps/dashboard/src/components/chat/) use MUI. Widget components (in packages/agent-ui/) use Tailwind.
- **Anonymous sessions**: Widget creates sessions with `sessionToken` (stored in localStorage). No login required.
- **Streaming**: Uses `@ai-sdk/react` `useChat` hook for client-side streaming integration.
- **Widget bundle**: Vite builds a standalone `chat-widget.js` for embedding on external sites via `<script data-tenant="..." />`.
- **TDD**: Tests before implementation.

## Architecture (see `architecture.md`)

### module-chat Engine
1. **SessionManager** — Create/resume sessions. Auth sessions use userId, anonymous use sessionToken. Auto-resolve agent from tenant config or explicit agentSlug.
2. **MessageProcessor** — Receive message → validate → route to agent-core invoke → stream response → record message + actions.
3. **StreamingAdapter** — Bridge between agent-core SSE and chat API response. Forward token events, tool call events, completion.
4. **EscalationHandler** — Detect escalation triggers in agent response (e.g., `handoff=true` in tool result). Switch session status to escalated, emit event, return human contact info.
5. **AnalyticsCollector** — On session close: compute duration, message count, token usage, satisfaction score.

### agent-ui Components
1. **ChatWidget** — Self-contained floating chat with: bubble launcher, welcome screen, message list, input bar, typing indicator, escalation banner, appointment button. Props: `tenantSlug, agentSlug?, theme, position, quickReplies?, welcomeMessage?`
2. **AgentPlayground** — Full testing interface: agent selector, message list, input with file upload, exposed params sidebar, tool call cards, execution metadata.
3. **ConversationView** — Read-only message history with role-based styling, timestamps, tool call expansion, export.

### Widget Embedding
```html
<script src="https://cdn.example.com/chat-widget.js"
        data-tenant="clinica-xyz" data-theme="light"
        data-position="bottom-right"
        data-quick-replies="Horarios,Servicios,Agendamiento" defer></script>
```
The `mount.tsx` reads `data-*` attrs → creates container → renders `<ChatWidget>` in shadow DOM (style isolation).

## Database — module-chat (see `database.md`)

4 tables:

**`chat_sessions`**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenantId | integer NOT NULL | + index |
| agentId | integer | FK to agents (plain int) |
| userId | integer (nullable) | Auth sessions |
| sessionToken | varchar(128) (nullable) | Anonymous sessions (widget) |
| channel | varchar(32) | 'web', 'widget', 'whatsapp', 'portal' |
| title | varchar(255) | Auto-generated or user-set |
| status | varchar(32) | 'active', 'escalated', 'closed', 'archived' |
| context | jsonb | Session-level context |
| metadata | jsonb | { userAgent, referrer, tenantConfig } |
| createdAt, updatedAt | timestamp | |

**`chat_messages`**
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| sessionId | integer NOT NULL | + index |
| role | varchar(32) | 'user', 'assistant', 'system', 'tool' |
| content | jsonb | Parts-based: [{type:'text',text:'...'}, {type:'image',url:'...'}] |
| toolCalls | jsonb (nullable) | Tool calls made by assistant |
| toolResults | jsonb (nullable) | Results from tool execution |
| metadata | jsonb | { model, tokens, latencyMs, cost } |
| createdAt | timestamp | |

**`chat_actions`** — Tool call records
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| sessionId | integer NOT NULL | |
| messageId | integer NOT NULL | |
| toolName | varchar(128) | |
| moduleName | varchar(64) | |
| input | jsonb | |
| output | jsonb | |
| status | varchar(32) | 'success', 'error' |
| durationMs | integer | |
| createdAt | timestamp | |

**`chat_analytics`** — Session-level analytics
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| sessionId | integer NOT NULL UNIQUE | |
| tenantId | integer NOT NULL | |
| durationSeconds | integer | |
| messageCount | integer | |
| userMessageCount | integer | |
| totalTokens | integer | |
| totalCostCents | integer | |
| escalated | boolean | |
| satisfactionScore | integer (nullable) | 1-5 rating |
| createdAt | timestamp | |

## API Endpoints — module-chat (see `api.md`)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | /api/chat-sessions | Auth | List sessions (tenant/agent/status filters) |
| POST | /api/chat-sessions | **Flexible** | Create session (auth or anonymous via sessionToken) |
| GET | /api/chat-sessions/[id] | Auth | Get session with recent messages |
| DELETE | /api/chat-sessions/[id] | Auth | Archive session |
| GET | /api/chat-sessions/[id]/messages | Auth | List messages in session |
| POST | /api/chat-sessions/[id]/messages | **Flexible** | Send message → agent invocation → stream response |
| GET | /api/chat-sessions/[id]/actions | Auth | List tool actions in session |
| GET | /api/chat-analytics | Auth | Session analytics list |
| GET | /api/chat-analytics/summary | Auth | Aggregated analytics (per-tenant) |

**Send message** is the critical path:
```
POST /api/chat-sessions/[id]/messages
  → Validate session (auth or sessionToken)
  → Resolve agent for session
  → Call agent-core invoke (with session messages as context)
  → Stream response via SSE
  → Record assistant message + tool actions
  → Update analytics
```

## Events — module-chat

| Event | Payload |
|-------|---------|
| `chat.session.created` | id, tenantId, agentId, channel |
| `chat.session.escalated` | id, tenantId, reason |
| `chat.session.closed` | id, tenantId, duration, messageCount |
| `chat.message.sent` | id, sessionId, role, channel |
| `chat.action.executed` | id, sessionId, toolName, status |

## agent-ui Package Structure

```
packages/agent-ui/
  package.json                  ← peerDeps: react, react-dom, @ai-sdk/react
  tsconfig.json
  vite.config.ts                ← Library build (React components)
  vite.config.widget.ts         ← Standalone widget bundle
  src/
    index.ts                    ← Export ChatWidget, AgentPlayground, ConversationView
    widget/
      ChatWidget.tsx            ← Main widget (tenantSlug, theme, agentSlug, position)
      ChatBubble.tsx            ← Message bubble (user/assistant/system styling)
      TypingIndicator.tsx       ← Animated dots
      WelcomeScreen.tsx         ← Welcome message + quick-reply buttons
      EscalationBanner.tsx      ← Contact info when handoff=true
      AppointmentButton.tsx     ← "Agendar cita" → opens schedulingUrl
      WidgetLauncher.tsx        ← Floating bubble button (open/close)
      mount.tsx                 ← Auto-mount: reads data-* attrs, renders into shadow DOM
      styles.css                ← CSS custom properties for theming
    playground/
      AgentPlayground.tsx       ← Full playground for dashboard
      ToolCallCard.tsx          ← Expandable tool invocation display
      ParamsPanel.tsx           ← Exposed params sidebar
    shared/
      ConversationView.tsx      ← Read-only message thread
      MessageList.tsx           ← Scrollable with auto-scroll
      MessageInput.tsx          ← Text input + send + file attach
      StreamingText.tsx         ← Token-by-token rendering
    hooks/
      useChat.ts                ← Wrapper around @ai-sdk/react useChat
      useTenantConfig.ts        ← Fetch public tenant config
      useBusinessHours.ts       ← Compute business hours status
      useAnonymousSession.ts    ← Session token management (localStorage)
    themes/
      light.css                 ← CSS custom properties (light)
      dark.css                  ← CSS custom properties (dark)
    types.ts
```

**Widget CSS Custom Properties**:
```css
--oven-widget-primary, --oven-widget-surface, --oven-widget-background,
--oven-widget-text, --oven-widget-border-radius, --oven-widget-font-family,
--oven-widget-bubble-user, --oven-widget-bubble-assistant,
--oven-widget-max-width (400px), --oven-widget-max-height (600px)
```

## Dashboard UI — module-chat (see `UI.md`)

Components in `apps/dashboard/src/components/chat/` (MUI):
- ChatSessionList — Columns: tenant, user/anonymous, agent, title, channel, message count, status, created
- ChatSessionShow — Chat bubble layout, tool call cards, metadata per message
- ChatInterface — Full-page: sidebar sessions list + main conversation area + agent selector
- ChatSidebar — Collapsible panel (for embedding in layout)
- ActionCard — Reusable tool invocation card

Menu section: `──── Chat ────` with Chat (custom page), Chat Sessions

## Seed Data — module-chat

1. Permissions: `chat-sessions.read/create`, `chat-messages.read/create`, `chat-analytics.read`
2. Public endpoints: `POST /api/chat-sessions` (anonymous creation), `POST /api/chat-sessions/[id]/messages` (anonymous messaging)

## Config Schema — module-chat

| Key | Type | Default | Instance-Scoped |
|-----|------|---------|:---:|
| `MAX_MESSAGES_PER_SESSION` | number | 100 | Yes |
| `SESSION_TIMEOUT_MINUTES` | number | 30 | Yes |
| `ANONYMOUS_SESSIONS_ENABLED` | boolean | true | Yes |
| `ESCALATION_KEYWORDS` | string | 'humano,persona,ayuda real' | Yes |
| `SHOW_POWERED_BY` | boolean | true | Yes |
| `ENABLE_FILE_UPLOAD` | boolean | false | Yes |

## Security (see `secure.md`)

- Anonymous sessions: sessionToken generated server-side, stored client-side in localStorage
- Anonymous users can only access their own session (validated by sessionToken header)
- Rate limiting on message sending (per session and per IP)
- Content moderation: messages pass through guardrails (module-ai)
- No PII exposure: anonymous sessions don't link to user accounts
- Widget CORS: configurable allowed origins per tenant
- Shadow DOM isolation: widget styles don't leak into host page

## New Subsystems (Phase 4A Expansion)

### Command System (inspired by Claude Code)
- 15 built-in `/slash` commands (help, clear, agent, tools, search, mode, export, status, feedback, reset, model, temperature, skill, mcp, pin)
- Commands execute locally without LLM reasoning
- Custom commands per-tenant via `chat_commands` table
- See `08-chat.md` section 4A for full specification

### Skill System (inspired by Claude Code)
- 6 built-in skills (summarize, translate, extract, analyze, faq-create, report)
- Skills are prompt templates with `whenToUse` for auto-selection
- Custom skills per-tenant via `chat_skills` table
- MCP-provided skills from connected MCP servers

### Hook System (inspired by Claude Code)
- 8 lifecycle events (pre-message, post-message, pre-tool-use, post-tool-use, on-error, on-escalation, session-start, session-end)
- Handlers: condition, api, event, guardrail
- Priority-ordered execution
- Per-tenant hook definitions via `chat_hooks` table

### MCP Integration (inspired by Claude Code)
- Connect external MCP servers (stdio, sse, http, ws transports)
- Tool discovery + caching in `chat_mcp_connections`
- Bridge MCP tools into agent tool catalog
- Per-tenant MCP connections

### Prompt Builder (inspired by Claude Code)
- Dynamic system prompt assembly with section caching
- Static sections (agent prompt, tenant, commands, skills) cached across turns
- Dynamic sections (tools, KB context, session context, hooks) recomputed per turn
- ~40-60% prompt token cost reduction

### Additional Database Tables
- `chat_commands` — Registered /slash commands
- `chat_skills` — Loadable skill definitions
- `chat_hooks` — Lifecycle hook definitions
- `chat_mcp_connections` — MCP server connections per tenant
- `chat_feedback` — Message quality feedback

### Additional API Endpoints
| Method | Route | Purpose |
|--------|-------|---------|
| GET | /api/chat-commands | List available commands |
| POST | /api/chat-commands/[slug]/execute | Execute a command |
| GET/POST | /api/chat-skills | CRUD skills |
| GET/PUT/DELETE | /api/chat-skills/[id] | Single skill ops |
| GET/POST | /api/chat-hooks | CRUD hooks |
| GET/PUT/DELETE | /api/chat-hooks/[id] | Single hook ops |
| GET/POST/DELETE | /api/chat-mcp-servers | MCP connection CRUD |
| POST | /api/chat-mcp-servers/[id]/connect | Connect to MCP server |
| GET | /api/chat-mcp-servers/[id]/tools | Discovered tools |
| POST | /api/chat-feedback | Submit message feedback |

### Additional Config Keys
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ENABLE_COMMANDS` | boolean | true | Enable /slash commands |
| `ENABLE_SKILLS` | boolean | true | Enable skill system |
| `ENABLE_HOOKS` | boolean | true | Enable hook system |
| `ENABLE_MCP` | boolean | false | Enable MCP integration |
| `MAX_MCP_CONNECTIONS` | number | 5 | Max MCP servers per tenant |
| `COMMAND_PREFIX` | string | '/' | Command prefix character |

---

## Test Plan (TDD) — Updated

### module-chat Engine Tests
1. `chat-service.test.ts` — 15 tests (message flow, agent invocation, error handling)
2. `command-registry.test.ts` — 12 tests (registration, discovery, execution, permissions)
3. `skill-loader.test.ts` — 10 tests (loading, merging, deduplication, templates)
4. `hook-manager.test.ts` — 12 tests (event dispatch, handler execution, ordering)
5. `prompt-builder.test.ts` — 10 tests (section assembly, caching, dynamic content)
6. `streaming-handler.test.ts` — 8 tests (SSE, token streaming, abort, error)
7. `context-manager.test.ts` — 8 tests (accumulation, limits, cleanup)

### module-chat Handler Tests
8. `chat-sessions.handler.test.ts` — 8 tests (CRUD, anonymous auth, tenant filtering)
9. `chat-messages.handler.test.ts` — 10 tests (send message, streaming, tool actions)
10. `chat-commands.handler.test.ts` — 6 tests
11. `chat-skills.handler.test.ts` — 6 tests
12. `chat-hooks.handler.test.ts` — 6 tests
13. `chat-feedback.handler.test.ts` — 4 tests

### module-chat MCP Tests
14. `mcp-connector.test.ts` — 10 tests (connect, disconnect, retry, timeout)
15. `mcp-tool-bridge.test.ts` — 8 tests (discovery, invocation, error handling)
16. `mcp-server-manager.test.ts` — 6 tests (lifecycle, status tracking)
17. `chat-mcp-servers.handler.test.ts` — 6 tests

### module-chat Command + Skill Tests
18. `commands/*.test.ts` — 15 tests (one per built-in command)
19. `skills/builtin/*.test.ts` — 6 tests (one per built-in skill)

### agent-ui Component Tests
20. `ChatWidget.test.tsx` — render, open/close, send message, receive response
21. `AgentPlayground.test.tsx` — agent selector, param panel, tool call display
22. `ConversationView.test.tsx` — message list, role styling, timestamps
23. `useAnonymousSession.test.ts` — token creation, persistence, reuse

**Total Target**: ~166 tests / 17 suites (module-chat) + ~24 tests / 4 suites (agent-ui)
