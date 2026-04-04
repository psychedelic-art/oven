# Detailed Requirements: module-chat + agent-ui

> Functional requirements with acceptance criteria for both packages.

---

## FR-CH-001: Session Management

**Description**: The system must support creating, resuming, closing, and archiving chat sessions for both authenticated and anonymous users.

**Acceptance Criteria**:

1. **Authenticated session creation**: `POST /api/chat-sessions` with a valid auth cookie/JWT creates a session with `userId` populated, `sessionToken` null, and `status` set to `active`.
2. **Anonymous session creation**: `POST /api/chat-sessions` with `{ tenantSlug, channel: 'widget' }` and no auth token creates a session with `userId` null, a server-generated `sessionToken` (128 random characters), and `status` set to `active`.
3. **Session resume**: Anonymous sessions are resumed by including the `X-Session-Token` header on subsequent requests. If the token is valid and the session is active, the request proceeds. If the session is closed/archived, return HTTP 410.
4. **Agent resolution**: On session creation, the system resolves the backing agent in this priority order: explicit `agentSlug` in the request body, tenant-configured default agent (via module-config `DEFAULT_AGENT_SLUG`), platform default agent.
5. **Session close**: Setting status to `closed` emits `chat.session.closed` with duration and message count. Closed sessions reject new messages with HTTP 403.
6. **Session archive**: `DELETE /api/chat-sessions/[id]` sets status to `archived`. Archived sessions are excluded from list queries by default.
7. **Session timeout**: Sessions with no activity (no new messages) for longer than `SESSION_TIMEOUT_MINUTES` (configurable per tenant, default 30) are automatically closed on the next request or by a background check.
8. **Channel tracking**: The `channel` field is set at creation time (`web`, `widget`, `portal`, `whatsapp`) and cannot be changed.

---

## FR-CH-002: Message Processing

**Description**: The system must accept user messages, route them to the appropriate agent, and record both the user message and the agent response.

**Acceptance Criteria**:

1. **Message validation**: Content must be a valid JSONB array of parts. Each part must have a `type` field (`text`, `image`, `file`). Text parts must have a non-empty `text` field.
2. **Session state check**: Messages can only be sent to sessions with status `active` or `escalated`. Sending to `closed` or `archived` sessions returns HTTP 403.
3. **User message recording**: The user message is inserted into `chat_messages` with `role: 'user'` before agent invocation begins. This ensures the message is persisted even if agent invocation fails.
4. **Agent invocation**: The MessageProcessor calls agent-core's invoke endpoint with the session's message history (up to a configurable context window) and session context.
5. **Response recording**: After streaming completes, the full assistant response is inserted into `chat_messages` with `role: 'assistant'`, including `metadata` (model, tokens, latencyMs, cost).
6. **Tool action recording**: Each tool call made by the agent during response generation is recorded in `chat_actions` with `toolName`, `moduleName`, `input`, `output`, `status`, and `durationMs`.
7. **Context update**: The session's `context` JSONB field is updated with any entity references from the conversation (agent-determined).

---

## FR-CH-003: Streaming Response

**Description**: The system must deliver agent responses in real-time via Server-Sent Events (SSE).

**Acceptance Criteria**:

1. **SSE format**: The response uses `Content-Type: text/event-stream` with events formatted as `event: {type}\ndata: {json}\n\n`.
2. **Token events**: Each generated token is sent as `event: token\ndata: {"text": "..."}\n\n`. Tokens are sent as they arrive from the model with minimal buffering.
3. **Tool call start**: When the agent begins a tool invocation, send `event: toolCallStart\ndata: {"toolCallId": "...", "toolName": "...", "input": {...}}\n\n`.
4. **Tool call end**: When tool execution completes, send `event: toolCallEnd\ndata: {"toolCallId": "...", "output": {...}, "durationMs": N, "status": "success|error"}\n\n`.
5. **Done event**: After the full response is recorded, send `event: done\ndata: {"messageId": N, "metadata": {...}}\n\n`.
6. **Error event**: On unrecoverable errors, send `event: error\ndata: {"code": "...", "message": "..."}\n\n` and close the connection.
7. **Connection abort**: If the client disconnects, the server cancels the in-progress agent invocation via AbortController and records the partial response.
8. **Client integration**: The `useChat` hook from `@ai-sdk/react` consumes these events and updates the UI reactively. The hook manages status transitions: `submitted` -> `streaming` -> `ready`.

---

## FR-CH-004: Escalation Detection

**Description**: The system must detect when a conversation requires human intervention and transition the session to an escalated state.

**Acceptance Criteria**:

1. **Keyword detection**: When a user message contains any word from the `ESCALATION_KEYWORDS` config (comma-separated, case-insensitive), the EscalationHandler flags the session for escalation.
2. **Agent-initiated escalation**: When the agent's response includes a tool call result with `handoff: true`, the system escalates the session.
3. **Status transition**: On escalation, session status changes from `active` to `escalated`.
4. **Event emission**: `chat.session.escalated` is emitted with `{ id, tenantId, reason }` where reason describes the trigger (keyword match or agent handoff).
5. **Contact info return**: The escalation response includes the tenant's human contact information (phone, email, WhatsApp link) resolved from tenant config.
6. **Widget display**: The EscalationBanner component displays the contact info prominently. The message input remains active (user can still type, but the system message indicates a human will follow up).
7. **Analytics flag**: The `chat_analytics` record for the session has `escalated: true`.

---

## FR-CH-005: Session Analytics

**Description**: The system must compute and store per-session analytics for reporting and optimization.

**Acceptance Criteria**:

1. **Analytics record creation**: A `chat_analytics` row is created or updated after each message in the session.
2. **Duration tracking**: `durationSeconds` is computed as the difference between session creation and the latest message timestamp.
3. **Message counting**: `messageCount` (all roles) and `userMessageCount` (role='user' only) are maintained.
4. **Token aggregation**: `totalTokens` sums the `metadata.tokens` field from all assistant messages.
5. **Cost estimation**: `totalCostCents` sums the `metadata.cost` field from all assistant messages. Cost is computed based on model pricing from module-ai.
6. **Escalation flag**: `escalated` is set to `true` if the session was ever in the `escalated` status.
7. **Satisfaction score**: `satisfactionScore` (1-5 integer, nullable) is set via the widget's post-session rating UI or a dedicated API endpoint.
8. **List endpoint**: `GET /api/chat-analytics` returns paginated analytics with tenant and date-range filters.
9. **Summary endpoint**: `GET /api/chat-analytics/summary` returns aggregated metrics per tenant: average duration, average messages, total sessions, escalation rate, average satisfaction.

---

## FR-CH-006: Anonymous Sessions

**Description**: The system must support chat sessions for unauthenticated users via the widget, using a server-generated session token.

**Acceptance Criteria**:

1. **Token generation**: On anonymous session creation, the server generates a cryptographically random 128-character token stored in the `sessionToken` column.
2. **Token delivery**: The session creation response includes `sessionToken` in the response body. The client stores it in localStorage under the key `oven-chat-{tenantSlug}`.
3. **Token validation**: All subsequent requests for anonymous sessions must include the `X-Session-Token` header. The server validates the token matches the session's `sessionToken` column.
4. **Session isolation**: Anonymous users can only access sessions where the sessionToken matches. They cannot list other sessions or access sessions by ID without the correct token.
5. **No PII**: Anonymous sessions have `userId: null`. No personal information is stored or required.
6. **Session resume**: When the widget loads and finds a sessionToken in localStorage, it fetches the session to check if it is still active. If active, it loads the message history. If closed/archived, it creates a new session.
7. **Token expiry**: Session tokens are valid for the lifetime of the session. When the session is closed or archived, the token becomes invalid.

---

## FR-CH-007: Chat Widget

**Description**: agent-ui must provide an embeddable floating chat widget that works on any website.

**Acceptance Criteria**:

1. **Launcher button**: A floating circular button (configurable position: bottom-right or bottom-left) toggles the chat panel open/closed.
2. **Welcome screen**: Before the first message, the widget displays a welcome message (from tenant config or prop override) and optional quick-reply buttons.
3. **Business hours awareness**: The welcome message varies based on the tenant's schedule. During business hours: the business-hours welcome message. Outside hours: the out-of-hours welcome message with a note about response times.
4. **Message list**: Messages display in a scrollable container with auto-scroll on new messages. User messages are right-aligned with the primary color. Assistant messages are left-aligned with the surface color.
5. **Input bar**: Text input with send button. Optional file attachment button (when `ENABLE_FILE_UPLOAD` config is true).
6. **Typing indicator**: Animated three-dot indicator displays while the agent is generating a response (streaming status).
7. **Escalation banner**: When the session is escalated, a banner displays with the tenant's contact information (phone, email, WhatsApp).
8. **Appointment button**: When `showSchedulingButton` is true and the tenant has a `schedulingUrl` configured, a CTA button appears that opens the URL in a new tab.
9. **Responsive**: On mobile viewports (< 640px), the widget opens as a full-screen overlay. On desktop, it opens as a floating panel (configurable max-width: 400px, max-height: 600px).
10. **Theming**: The widget applies CSS custom properties from tenant config for branding (primary color, surface color, border radius, font family).

---

## FR-CH-008: Agent Playground

**Description**: agent-ui must provide a full-featured agent testing interface for dashboard users.

**Acceptance Criteria**:

1. **Agent selector**: A dropdown lists all available agents (from `GET /api/agents`). Selecting an agent starts a new session backed by that agent.
2. **Message exchange**: Users can send text messages and receive streaming responses, identical to the widget experience.
3. **Exposed params**: When `showExposedParams` is true, a sidebar panel displays the selected agent's configurable parameters (model, temperature, maxTokens) with editable controls.
4. **Tool call display**: When `showToolCalls` is true, each tool invocation is rendered as an expandable ToolCallCard showing the tool name, input (formatted JSON), output (formatted JSON), duration, and status.
5. **Execution metadata**: When `showExecutionMetadata` is true, each response displays metadata: token count, latency, model used, estimated cost.
6. **File upload**: The input supports drag-and-drop and file picker for image/document upload (displayed as parts in the message).
7. **Session management**: A "New Session" button creates a fresh session. A session history list shows recent playground sessions.

---

## FR-CH-009: Conversation View

**Description**: agent-ui must provide a read-only message history component for reviewing past conversations.

**Acceptance Criteria**:

1. **Message display**: All messages in the session are rendered with role-based styling (user, assistant, system, tool).
2. **Timestamps**: When `showTimestamps` is true, each message displays its creation timestamp (relative format: "2m ago", or absolute on hover).
3. **Tool call expansion**: When `showToolCalls` is true, tool invocations are rendered as collapsible sections showing input and output.
4. **Metadata**: When `showMetadata` is true, a side panel or header section displays session metadata (agent, channel, status, duration, message count).
5. **Export**: Users can copy the conversation to clipboard (formatted text) or download as JSON.
6. **No input**: The component does not render a message input. It is strictly read-only.

---

## FR-CH-010: Widget Embedding

**Description**: The chat widget must be embeddable on external websites via a single `<script>` tag with declarative configuration.

**Acceptance Criteria**:

1. **Script tag**: The widget is loaded via `<script src="https://cdn.example.com/chat-widget.js" data-tenant="..." defer></script>`.
2. **Data attributes**: Configuration is passed via `data-*` attributes: `data-tenant` (required), `data-theme` (light/dark/auto), `data-position` (bottom-right/bottom-left), `data-quick-replies` (comma-separated), `data-agent` (optional agent slug), `data-welcome` (optional welcome message override).
3. **Shadow DOM isolation**: The widget renders inside a shadow DOM to prevent style conflicts with the host page. The host page's CSS does not affect the widget; the widget's CSS does not leak into the host page.
4. **Self-contained bundle**: The `chat-widget.js` file includes all dependencies (React, hooks, styles). No additional script tags or CSS files are required.
5. **No global pollution**: The widget does not pollute the global namespace beyond a single `window.__OVEN_CHAT_WIDGET__` object (for programmatic access).
6. **Deferred loading**: The `defer` attribute ensures the widget does not block page parsing. The mount logic runs on `DOMContentLoaded`.
7. **Multiple instances**: Multiple script tags with different `data-tenant` values can coexist on the same page (each creates its own shadow DOM container).

---

## FR-CH-011: Business Hours Awareness

**Description**: The widget must display different content based on the tenant's business schedule.

**Acceptance Criteria**:

1. **Schedule resolution**: The widget fetches the tenant's schedule from `GET /api/tenants/[slug]/public`. The schedule is a JSON object mapping days of the week to open/close times.
2. **Open/closed computation**: The `useBusinessHours` hook computes whether the current time falls within any of the schedule's open windows, accounting for the tenant's timezone.
3. **Welcome message**: During business hours, display `WELCOME_MESSAGE_BUSINESS_HOURS`. Outside hours, display `WELCOME_MESSAGE_OUT_OF_HOURS`.
4. **Visual indicator**: The widget header shows a green dot and "Online" during business hours, or a gray dot and "Away" outside hours.
5. **Refresh interval**: The business hours status is recomputed every 60 seconds to handle schedule transitions during an open session.

---

## FR-CH-012: Quick Replies

**Description**: The widget must display category buttons before the first message to guide users toward common topics.

**Acceptance Criteria**:

1. **Button display**: Quick-reply buttons appear on the WelcomeScreen below the welcome message.
2. **Configuration**: Buttons are configured via the `data-quick-replies` attribute (comma-separated strings) or the `quickReplies` prop (string array).
3. **Click behavior**: Clicking a quick-reply button sends the button text as the first user message, exactly as if the user had typed it.
4. **Disappearance**: Quick-reply buttons disappear after the first message is sent (either via button click or manual typing).
5. **Styling**: Buttons use the widget's primary color as outline/text color, with a hover state that fills the background.

---

## FR-CH-013: File Upload in Chat

**Description**: The widget and playground must support optional file upload within the chat conversation.

**Acceptance Criteria**:

1. **Configuration**: File upload is enabled per tenant via the `ENABLE_FILE_UPLOAD` module-config key (default: false).
2. **Widget**: When enabled, a paperclip icon appears next to the send button. Clicking it opens a file picker. Selected files are uploaded and sent as `{ type: 'image', url: '...' }` or `{ type: 'file', url: '...', name: '...' }` parts in the message content.
3. **Playground**: File upload is always available in the playground (drag-and-drop zone + file picker), regardless of the config setting.
4. **File handling**: Files are uploaded via `module-files` upload API. The returned URL is used in the message part.
5. **Size limits**: Maximum file size is 10MB. Accepted types: images (png, jpg, gif, webp), documents (pdf, txt, csv). Files exceeding limits show an inline error.
6. **Preview**: Uploaded images display as thumbnails in the message bubble. Documents display as filename + icon.
