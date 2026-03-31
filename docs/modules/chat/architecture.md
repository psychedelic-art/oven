# Architecture: module-chat + agent-ui

> Design patterns, message flow, and structural decisions for both packages.

---

## 1. Design Patterns

### 1.1 Mediator Pattern -- MessageProcessor (module-chat)

The MessageProcessor acts as a central coordinator that orchestrates the complete message lifecycle. No component in the pipeline communicates directly with another; all interactions flow through the mediator.

```
User Message
    |
    v
MessageProcessor (mediator)
    |--- validate message format and session state
    |--- resolve agent for session (via SessionManager)
    |--- invoke agent-core with session context
    |--- forward SSE stream to client (via StreamingAdapter)
    |--- record assistant message and tool actions
    |--- update analytics counters
    |--- check escalation triggers (via EscalationHandler)
    v
Response delivered
```

The mediator owns the transaction boundary: if agent invocation fails, the user message is still recorded but the error is returned inline. If recording fails after a successful response, the response is still delivered (eventual consistency for analytics).

### 1.2 Observer Pattern -- SSE Streaming (module-chat)

The StreamingAdapter implements a publish-subscribe model for real-time token delivery. The agent-core invocation produces a stream of events; the adapter transforms and forwards them to the HTTP response.

**Event types emitted:**

| Event | Payload | When |
|-------|---------|------|
| `token` | `{ text: string }` | Each generated token |
| `toolCallStart` | `{ toolCallId, toolName, input }` | Agent begins a tool invocation |
| `toolCallEnd` | `{ toolCallId, output, durationMs, status }` | Tool execution completes |
| `done` | `{ messageId, metadata }` | Full response recorded |
| `error` | `{ code, message }` | Unrecoverable error |

Subscribers (the client-side `useChat` hook) consume these events and update the UI reactively. The observer model means the server never waits for client acknowledgment -- it pushes tokens as they arrive.

### 1.3 Strategy Pattern -- Session Authentication (module-chat)

Session creation and validation use interchangeable authentication strategies based on the channel:

```
SessionAuthStrategy (interface)
    |
    +-- AuthenticatedStrategy
    |     - Reads userId from auth middleware headers
    |     - Requires valid JWT / session cookie
    |     - Used by: 'web', 'portal' channels
    |
    +-- AnonymousStrategy
          - Generates server-side sessionToken (128-char random)
          - Validates via X-Session-Token header on subsequent requests
          - Used by: 'widget' channel
          - No userId, no login required
```

The SessionManager accepts a strategy at session creation time and delegates all auth checks to it. This allows adding new strategies (e.g., WhatsApp webhook verification) without modifying the session management logic.

### 1.4 Facade Pattern -- ChatWidget (agent-ui)

ChatWidget presents a simple props interface while internally coordinating multiple complex subsystems:

```
ChatWidget (facade)
    |
    +-- useTenantConfig    --> fetches branding, schedule, contact info
    +-- useBusinessHours   --> computes open/closed status
    +-- useAnonymousSession --> manages sessionToken in localStorage
    +-- useChat            --> manages streaming conversation with API
    +-- EscalationHandler  --> detects and displays escalation state
    +-- Theme engine       --> applies CSS custom properties
```

The consumer passes `tenantSlug` and optional overrides. Everything else -- session creation, token management, config fetching, theming, streaming -- is handled internally.

### 1.5 Builder Pattern -- Widget Mount (agent-ui)

The `mount.tsx` entry point reads `data-*` attributes from the `<script>` tag and incrementally builds the ChatWidget configuration:

```
<script> tag with data-* attributes
    |
    v
mount.tsx reads attributes
    |--- data-tenant     --> tenantSlug (required)
    |--- data-theme      --> theme (default: 'auto')
    |--- data-position   --> position (default: 'bottom-right')
    |--- data-quick-replies --> quickReplies[] (comma-separated)
    |--- data-agent      --> agentSlug (optional)
    |--- data-welcome    --> welcomeMessage (optional)
    v
Constructs ChatWidgetProps object
    |
    v
Creates shadow DOM container
    |
    v
Renders <ChatWidget {...props} /> into shadow root
```

The builder validates each attribute and applies defaults. Invalid configurations produce a console warning rather than a crash.

### 1.6 Adapter Pattern -- StreamingAdapter (module-chat)

The StreamingAdapter bridges two incompatible interfaces: the agent-core SSE event format (which follows the AI SDK streaming protocol) and the chat API response format (which adds session-specific metadata and persists messages).

```
agent-core SSE stream                 chat API SSE stream
(raw AI SDK format)                   (enriched format)
    |                                     ^
    v                                     |
StreamingAdapter
    |--- transforms token events (passthrough)
    |--- enriches tool calls with module metadata
    |--- buffers full response for DB persistence
    |--- computes metadata (tokens, latency, cost)
    |--- emits 'done' with messageId after persistence
```

### 1.7 State Machine -- Session Lifecycle (module-chat)

Chat sessions follow a strict state machine with defined transitions:

```
                    create
                      |
                      v
                  +--------+
                  | active |<-------+
                  +--------+        |
                   /      \         |
          escalate/        \close   | reopen
                 /          \       |   (admin)
                v            v      |
         +-----------+   +--------+ |
         | escalated |-->| closed |-+
         +-----------+   +--------+
                              |
                         archive|
                              v
                        +----------+
                        | archived |
                        +----------+

Transitions:
  active --> escalated : EscalationHandler detects trigger
  active --> closed    : User ends session, or SESSION_TIMEOUT_MINUTES exceeded
  escalated --> closed : Agent or admin resolves escalation
  closed --> active    : Admin reopens session (rare)
  closed --> archived  : Explicit archive (DELETE endpoint) or auto-archive after retention period
  archived --> (none)  : Terminal state, soft-deleted from active queries
```

Each transition emits the corresponding event (`chat.session.escalated`, `chat.session.closed`).

---

## 2. Message Flow

### 2.1 Authenticated User (Dashboard/Portal)

```
Dashboard UI                  module-chat API               module-agent-core
    |                              |                              |
    |-- POST /chat-sessions ------>|                              |
    |   {agentSlug, channel:'web'} |                              |
    |<---- {id, status:'active'} --|                              |
    |                              |                              |
    |-- POST /sessions/1/messages->|                              |
    |   {content:[{type:'text'...}]|                              |
    |                              |-- resolve agent for session->|
    |                              |-- invoke(agentId, messages)  |
    |                              |                              |-- LLM reasoning
    |                              |                              |-- tool calls
    |                              |<-- SSE stream (tokens) ------|
    |<-- SSE stream (enriched) ----|                              |
    |                              |-- record message + actions   |
    |                              |-- update analytics           |
    |                              |-- check escalation           |
```

### 2.2 Anonymous User (Widget)

```
External Website              chat-widget.js          module-chat API          Tenant Config
    |                              |                       |                       |
    | <script data-tenant="...">   |                       |                       |
    |                              |                       |                       |
    |                              |-- GET /tenants/[slug]/public --------------->|
    |                              |<-- {branding, schedule, welcome, contact} ---|
    |                              |                       |                       |
    |   (user clicks launcher)     |                       |                       |
    |                              |-- POST /chat-sessions |                       |
    |                              |   {tenantSlug,        |                       |
    |                              |    channel:'widget'}  |                       |
    |                              |<-- {id, sessionToken} |                       |
    |                              |   (store in localStorage)                     |
    |                              |                       |                       |
    |   (user types message)       |                       |                       |
    |                              |-- POST /sessions/1/messages                   |
    |                              |   X-Session-Token: abc |                       |
    |                              |<-- SSE stream --------|                       |
```

### 2.3 Widget Embedding Flow

```
1. Browser loads page with <script src="chat-widget.js" data-tenant="..." defer>
2. mount.tsx executes on DOMContentLoaded:
   a. Finds the <script> tag by src attribute
   b. Reads data-* attributes (tenant, theme, position, quick-replies)
   c. Creates <div id="oven-chat-widget-root"> at end of <body>
   d. Attaches shadow DOM to the container
   e. Injects scoped CSS (light.css or dark.css) into shadow root
   f. Renders <ChatWidget {...props}> into shadow root via React.createRoot
3. ChatWidget initializes:
   a. useTenantConfig(tenantSlug) fetches public config
   b. useBusinessHours(config.schedule) computes open/closed
   c. Renders WidgetLauncher (floating bubble button)
4. User clicks launcher:
   a. Widget panel opens (slide-up animation)
   b. WelcomeScreen shows appropriate message + quick-reply buttons
5. User sends first message:
   a. useAnonymousSession creates session via POST /api/chat-sessions
   b. sessionToken stored in localStorage (key: oven-chat-{tenantSlug})
   c. Message sent via POST /api/chat-sessions/[id]/messages
   d. SSE stream renders tokens in real-time via StreamingText
6. Subsequent visits:
   a. useAnonymousSession reads sessionToken from localStorage
   b. Resumes existing session (messages loaded from API)
```

---

## 3. Package Boundaries

```
+------------------------------------------+
|  apps/dashboard                          |
|  +------------------------------------+  |
|  | src/components/chat/ (MUI + sx)    |  |
|  | ChatSessionList, ChatSessionShow,  |  |
|  | ChatInterface, ChatSidebar         |  |
|  +------------------------------------+  |
|       |  imports                         |
|       v                                  |
|  +------------------------------------+  |
|  | @oven/agent-ui (Tailwind + cn)     |  |
|  | AgentPlayground, ConversationView  |  |
|  +------------------------------------+  |
+------------------------------------------+
       |  API calls
       v
+------------------------------------------+
|  packages/module-chat                    |
|  SessionManager, MessageProcessor,       |
|  StreamingAdapter, EscalationHandler,    |
|  AnalyticsCollector                      |
+------------------------------------------+
       |  invokes
       v
+------------------------------------------+
|  packages/module-agent-core              |
|  Agent resolution, Tool Wrapper, LLM    |
+------------------------------------------+
       |  streams via
       v
+------------------------------------------+
|  packages/module-ai                      |
|  Provider registry, streaming, guardrails|
+------------------------------------------+
```

The dashboard's MUI chat components (ChatSessionList, ChatInterface) import from `@oven/agent-ui` for the ConversationView and AgentPlayground components. These agent-ui components use Tailwind internally but are rendered inside the MUI layout. The styling boundary is maintained: MUI components never pass `className` into agent-ui components beyond what `cn()` merges.

---

## 4. Concurrency and Error Handling

**Streaming abort**: If the client disconnects mid-stream, the server detects the closed connection and cancels the agent-core invocation via the `AbortController` signal. Partial messages are still recorded with a `metadata.aborted: true` flag.

**Session timeout**: A background check (or lazy check on next request) closes sessions that exceed `SESSION_TIMEOUT_MINUTES` without activity. The timeout is configurable per tenant via module-config.

**Rate limiting**: Message sending is rate-limited per session (configurable) and per IP (for anonymous sessions). Exceeding the limit returns HTTP 429 with a `Retry-After` header.

**Agent invocation failure**: If agent-core returns an error, the MessageProcessor records a system message with the error details and emits an `error` SSE event. The session remains active for retry.
