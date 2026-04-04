# Module Design: module-chat + agent-ui

> High-level and low-level design covering dependency graphs, internal components, and data flow.

---

## 1. Dependency Graph

### module-chat (ModuleDefinition)

```
module-chat
    |
    +-- module-registry (REQUIRED)
    |     Schema composition, parseListParams, listResponse,
    |     EventBus, API utilities
    |
    +-- module-agent-core (REQUIRED)
    |     Agent resolution by slug/id, invoke endpoint,
    |     Tool Wrapper for module discovery
    |
    +-- module-ai (REQUIRED)
    |     Streaming infrastructure, provider resolution,
    |     guardrails for content moderation
    |
    +-- module-tenants (REQUIRED)
          Tenant config resolution (branding, schedule,
          contact info, escalation keywords)
```

### agent-ui (Editor Package)

```
agent-ui
    |
    +-- module-chat (API consumer)
    |     POST /api/chat-sessions
    |     POST /api/chat-sessions/[id]/messages
    |     GET /api/chat-sessions/[id]/messages
    |     GET /api/chat-sessions/[id]/actions
    |
    +-- module-agent-core (API consumer)
    |     GET /api/agents (agent listing for playground)
    |     Agent invocation for playground testing
    |
    +-- @ai-sdk/react (peer dependency)
    |     useChat hook for streaming
    |
    +-- @oven/oven-ui (dependency)
          cn() utility for Tailwind class composition
```

### Reverse Dependencies

```
agent-ui is consumed by:
    +-- apps/dashboard (ChatPage, SessionShow)
    +-- module-ui-flows portal renderer (Chat page type)
    +-- External websites (via standalone chat-widget.js bundle)

module-chat is consumed by:
    +-- agent-ui (all API calls)
    +-- module-subscriptions (chat messages count toward quotas)
    +-- module-analytics (session analytics feed into reports)
```

---

## 2. Internal Components -- module-chat

### 2.1 SessionManager

**Responsibility**: Create, resume, validate, close, and archive chat sessions.

**Key behaviors**:
- Creates authenticated sessions (userId from auth middleware) or anonymous sessions (generates 128-char sessionToken)
- Resolves the backing agent: explicit `agentSlug` in request, or tenant-configured default, or platform default
- Validates session ownership on every request: authenticated users by userId, anonymous users by sessionToken header
- Handles session timeout: marks sessions as closed when `SESSION_TIMEOUT_MINUTES` exceeded since last activity
- Archives sessions on DELETE (soft delete -- sets status to 'archived')

**Dependencies**: Database (chat_sessions table), module-tenants (default agent config), module-config (timeout setting)

### 2.2 MessageProcessor

**Responsibility**: Orchestrate the full send-message lifecycle.

**Pipeline**:
1. Validate session state (must be 'active' or 'escalated')
2. Validate message format (parts-based JSONB content)
3. Check rate limits (per session and per IP)
4. Record user message in chat_messages
5. Assemble message history for context (last N messages up to token limit)
6. Invoke agent-core with session context and message history
7. Stream response via StreamingAdapter
8. Record assistant message with metadata (tokens, latency, cost)
9. Record tool actions in chat_actions
10. Update session's updatedAt timestamp
11. Check for escalation triggers in response
12. Update or create chat_analytics record

**Error recovery**: Steps 1-4 are synchronous validation. If step 6 fails (agent invocation error), an error SSE event is sent and the session remains active for retry. Steps 8-12 are post-response recording; failures are logged but do not affect the user-facing response.

### 2.3 StreamingAdapter

**Responsibility**: Bridge agent-core SSE format to chat API SSE format.

**Transformation logic**:
- Passes through `token` events unchanged (low latency path)
- Enriches `toolCallStart` events with module metadata (moduleName from action registry)
- Enriches `toolCallEnd` events with formatted output
- Buffers the complete response text for database persistence
- Computes metadata on `done`: total tokens, latency, estimated cost
- Emits `done` event with the persisted messageId

### 2.4 EscalationHandler

**Responsibility**: Detect when a conversation should be handed off to a human.

**Detection methods**:
- **Keyword matching**: Scans user messages for configured escalation keywords (from `ESCALATION_KEYWORDS` config). Keywords are case-insensitive and support the tenant's language.
- **Agent signal**: The agent can return a tool call result with `handoff: true`, which the EscalationHandler detects in the response stream.
- **Threshold**: If the session exceeds a configurable number of messages without resolution (future enhancement).

**Actions on escalation**:
1. Set session status to 'escalated'
2. Emit `chat.session.escalated` event with reason
3. Return tenant's contact info (phone, email, WhatsApp) from tenant config
4. Display EscalationBanner in the widget/chat UI

### 2.5 AnalyticsCollector

**Responsibility**: Compute and maintain per-session analytics.

**Tracked metrics**:
- `durationSeconds`: Time from session creation to last message
- `messageCount`: Total messages in session (all roles)
- `userMessageCount`: Messages with role='user'
- `totalTokens`: Sum of token usage across all assistant messages
- `totalCostCents`: Estimated cost in cents (from model pricing)
- `escalated`: Boolean flag if session was ever escalated
- `satisfactionScore`: 1-5 rating (collected via widget UI or POST endpoint)

**Update triggers**: Analytics row is created on first message and updated on each subsequent message. Final computation happens on session close.

---

## 3. Internal Components -- agent-ui

### 3.1 ChatWidget

**Responsibility**: Self-contained floating chat interface for end users.

**Sub-components**:
- `WidgetLauncher` -- Floating circular button (open/close toggle)
- `WelcomeScreen` -- Welcome message, quick-reply category buttons, business hours indicator
- `MessageList` -- Scrollable message container with auto-scroll
- `ChatBubble` -- Individual message bubble (user right-aligned primary, assistant left-aligned surface, system centered muted)
- `MessageInput` -- Text input with send button and optional file attachment
- `TypingIndicator` -- Animated three-dot indicator during streaming
- `EscalationBanner` -- Contact info display when session is escalated
- `AppointmentButton` -- CTA button that opens tenant's scheduling URL
- `StreamingText` -- Token-by-token rendering component

**State management**: Uses React state (useState/useReducer) for local UI state (open/closed, input value). Uses `useChat` from `@ai-sdk/react` for conversation state (messages, streaming status). No external state library needed.

### 3.2 AgentPlayground

**Responsibility**: Full-featured agent testing interface for dashboard users.

**Sub-components**:
- Agent selector dropdown (fetches from `/api/agents`)
- `MessageList` + `ChatBubble` (shared with widget)
- `MessageInput` with file upload (drag-and-drop + file picker)
- `ParamsPanel` -- Sidebar showing agent's `exposedParams` with editable controls (sliders, dropdowns, text inputs)
- `ToolCallCard` -- Expandable card showing tool name, input JSON, output JSON, duration, status
- Execution metadata display (token count, latency, model, cost estimate)
- Session management (new session, session history list)

### 3.3 ConversationView

**Responsibility**: Read-only message history display for reviewing past conversations.

**Features**:
- Role-based message styling (user, assistant, system, tool)
- Configurable timestamp display (relative or absolute)
- Collapsible tool call details
- Session metadata panel (context, agent info, analytics)
- Export: copy to clipboard as text, download as JSON

### 3.4 Hooks

**useChat**: Wrapper around `@ai-sdk/react` useChat that configures the API endpoint, adds the session token header for anonymous sessions, and handles error states.

**useTenantConfig**: Fetches `GET /api/tenants/[slug]/public` on mount, caches the result, and returns loading/error/data state. Used by ChatWidget to resolve branding, schedule, contact info.

**useBusinessHours**: Takes a schedule object (from tenant config) and the current time. Returns `{ isOpen: boolean, nextChange: Date, message: string }`. Recomputes on a 1-minute interval.

**useAnonymousSession**: Manages the anonymous session lifecycle. On first use, creates a session via `POST /api/chat-sessions` and stores the sessionToken in localStorage (key: `oven-chat-{tenantSlug}`). On subsequent visits, reads the token and resumes the session. Handles token expiry/invalidation by creating a new session.

---

## 4. Data Flow -- Complete Message Lifecycle

```
User types message in ChatWidget
    |
    v
useChat.sendMessage(content)
    |
    v
POST /api/chat-sessions/[id]/messages
    |  Headers: X-Session-Token (anonymous) or Cookie (auth)
    |  Body: { content: [{ type: 'text', text: '...' }] }
    |
    v
MessageProcessor.processMessage()
    |
    +-- 1. Validate session (SessionManager.validate)
    +-- 2. Check rate limit
    +-- 3. Insert user message into chat_messages
    +-- 4. Load message history (last N messages)
    +-- 5. Resolve agent (SessionManager.getAgent)
    +-- 6. Invoke agent-core: POST /api/agents/[slug]/invoke
    |       Body: { messages: [...history], context: session.context }
    |       Response: SSE stream
    |
    +-- 7. StreamingAdapter transforms and forwards events
    |       token -> token (passthrough)
    |       toolCallStart -> toolCallStart (enriched)
    |       toolCallEnd -> toolCallEnd (enriched)
    |
    +-- 8. On stream complete:
    |       - Insert assistant message into chat_messages
    |       - Insert tool actions into chat_actions
    |       - Update chat_analytics
    |       - Emit 'done' SSE event with messageId
    |
    +-- 9. EscalationHandler.check(response)
            If triggered: update session status, emit event
```

---

## 5. Widget Data Flow -- Script Tag to Chat

```
External Website HTML
    |
    | <script src=".../chat-widget.js" data-tenant="clinica-xyz" defer>
    |
    v
mount.tsx (entry point, runs on DOMContentLoaded)
    |
    +-- 1. Find script tag, read data-* attributes
    +-- 2. Validate tenantSlug (required)
    +-- 3. Build ChatWidgetProps from attributes
    +-- 4. Create container div at end of <body>
    +-- 5. Attach shadow DOM (style isolation)
    +-- 6. Inject theme CSS into shadow root
    +-- 7. React.createRoot(shadowRoot).render(<ChatWidget {...props} />)
    |
    v
ChatWidget initializes
    |
    +-- useTenantConfig(tenantSlug)
    |     GET /api/tenants/clinica-xyz/public
    |     Returns: { name, branding, schedule, contact, welcomeMessages }
    |
    +-- useBusinessHours(config.schedule)
    |     Computes: { isOpen: true, message: 'Open until 6:00 PM' }
    |
    +-- Apply theme: set CSS custom properties from config.branding
    |     --oven-widget-primary, --oven-widget-surface, etc.
    |
    +-- Render WidgetLauncher (floating button)
    |
    v
User clicks launcher --> Widget panel opens
    |
    +-- WelcomeScreen renders:
    |     - Welcome message (business hours or out-of-hours variant)
    |     - Quick-reply buttons (from data-quick-replies)
    |
    v
User sends first message
    |
    +-- useAnonymousSession.createSession()
    |     POST /api/chat-sessions
    |     Body: { tenantSlug: 'clinica-xyz', channel: 'widget' }
    |     Response: { id: 42, sessionToken: 'abc123...' }
    |     Stores sessionToken in localStorage
    |
    +-- useChat.sendMessage(content)
          POST /api/chat-sessions/42/messages
          Headers: { X-Session-Token: 'abc123...' }
          SSE response renders tokens via StreamingText
```

---

## 6. Integration with module-subscriptions

Chat messages count toward tenant service quotas. The integration is event-driven:

1. module-chat emits `chat.message.sent` event with `{ tenantId, role, channel }`
2. A wiring in module-subscriptions listens for this event
3. The wiring increments the tenant's usage counter for the "Chat Messages" service
4. If the quota is exceeded, the next `POST /api/chat-sessions/[id]/messages` request checks the limit and returns HTTP 429 with a message indicating the quota has been reached

This is fully decoupled. module-chat does not import or call module-subscriptions directly.

---

## 7. Build Configuration -- agent-ui

### Library Build (vite.config.ts)

Builds the React component library for consumption by the dashboard and portal:
- Entry: `src/index.ts`
- Output: ESM + CJS in `dist/`
- External: react, react-dom, @ai-sdk/react (peer dependencies)
- Includes TypeScript declarations

### Widget Build (vite.config.widget.ts)

Builds the standalone embeddable bundle:
- Entry: `src/widget/mount.tsx`
- Output: Single IIFE bundle `dist/chat-widget.js`
- Inlines: React, react-dom, @ai-sdk/react, all CSS
- Does NOT externalize anything (fully self-contained)
- Minified and gzipped for CDN delivery
- Target: ES2020 (covers 95%+ of browsers)
