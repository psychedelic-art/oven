# Agent UI — Consumed APIs

`@oven/agent-ui` is a **pure UI layer**. It exposes no endpoints. It
**consumes** endpoints from other modules. This document is the
canonical list of every endpoint it talks to, with the method, path,
response contract, and the component/hook that calls it.

Changing any endpoint in this list requires updating both the
producer module's `api.md` and this file.

---

## Tenant public config (module-tenants)

### `GET /api/tenants/[slug]/public`

Called by `useTenantConfig` at mount time for every widget/playground.
Returns only the fields safe to expose to an anonymous visitor.

```ts
interface TenantPublicConfig {
  slug: string;
  name: string;
  brand: {
    primary: string;
    surface: string;
    background: string;
    text: string;
    fontFamily?: string;
  };
  schedule: Record<
    'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
    { open: string; close: string } | null
  >;
  timezone: string;                   // IANA tz, e.g. "America/Bogota"
  welcomeBusinessHours: string | null;
  welcomeOutOfHours: string | null;
  contact: {
    phone?: string;
    email?: string;
    whatsapp?: string;
  };
  schedulingUrl?: string;
  tone?: 'friendly' | 'formal' | 'clinical';
}
```

Cached per `tenantSlug` for the lifetime of the component tree.

---

## Chat sessions (module-chat)

### `POST /api/chat-sessions`

Called by `useAnonymousSession` when no valid `sessionToken` exists in
`localStorage`, or when `useSessionPersistence` decides the stored
token is past its TTL.

Request:

```json
{
  "tenantSlug": "...",
  "agentSlug": "..."
}
```

Response:

```json
{
  "id": 12345,
  "sessionToken": "...",
  "createdAt": "2026-04-11T19:00:00.000Z"
}
```

The `sessionToken` is persisted to `localStorage` and sent on every
subsequent request as `X-Session-Token`.

### `GET /api/chat-sessions`

Consumed by `<SessionSidebar>` for dashboard users (not widgets).
Supports `parseListParams`-compatible `sort`/`order`/`filter.pinned`.

### `PATCH /api/chat-sessions/[id]`

Pin/unpin (`{ pinned: boolean }`) and rename (`{ title: string }`).

### `DELETE /api/chat-sessions/[id]`

Delete a session (confirm dialog).

### `GET /api/chat-sessions/[id]/export`

Download conversation as JSON / Markdown / plaintext. Format chosen
via `?format=` query.

### `POST /api/chat-sessions/[id]/messages`

Called by `useChat.sendMessage` in agent mode. Returns an
`EventSource`-compatible SSE stream of token deltas, tool-call
events, and error frames. `useChat` assembles the events into the
real-time message list.

### `GET /api/chat-sessions/[id]/messages`

Called by `useDualStateMessages` for paginated history (default page
size 20). Infinite-scroll at the top of `<MessageList>`.

---

## Chat commands (module-chat)

### `GET /api/chat-commands`

Called once at mount by `usePlaygroundCommands`. Returns the
backend-registered command list:

```ts
interface ChatCommand {
  name: string;                       // e.g. "search"
  description: string;
  category: 'Navigation' | 'Agent' | 'Tools' | 'Export' | 'Settings';
  paramHint?: string;                 // e.g. "<query>"
  requiresBackend: boolean;           // false → run locally
}
```

`usePlaygroundCommands` merges this list with the six locally-handled
commands (`/clear`, `/help`, `/status`, `/model`, `/temperature`,
`/export`). When a command has `requiresBackend=true`, the unknown
fallback path is taken.

---

## Chat feedback (module-chat)

### `POST /api/chat/feedback`

Called by `<MessageFeedback>` when the user clicks like/dislike.

```json
{
  "messageId": 42,
  "sessionId": 12345,
  "rating": "like" | "dislike",
  "comment": "optional"
}
```

Stored for later analytics. No response body beyond `{ ok: true }`.

---

## Agents & workflows (module-agent-core / module-workflow-agents)

### `GET /api/agents`

Consumed by `<TargetSelector>` (agent tab). Supports
`parseListParams` filters (`tenantId`, `enabled`, free-text `q`).

### `GET /api/agent-workflows`

Consumed by `<TargetSelector>` (workflow tab).

### `POST /api/agent-workflows/[id]/execute`

Called in **workflow mode** of `<UnifiedAIPlayground>`. The
playground bypasses `useChat.sendMessage` and fires this directly,
then polls or streams `GET /api/agent-workflow-executions/[id]`
until terminal.

### `GET /api/agent-workflow-executions/[id]`

Execution detail read by `<ExecutionInspector>` and `<TracePanel>`.
Includes node-level trace, cost, latency, and token counts.

---

## Files (module-files)

### `POST /api/files` *(only if `WIDGET_ENABLE_FILE_UPLOAD` is enabled)*

Called by `<MessageInput>` when the user attaches a file. Upload
response `{ id, url, mimeType, sizeBytes }` is embedded into the
next message as an attachment.

---

## Config cascade (module-config)

### `GET /api/config/resolve?scope=...`

Called once at mount to resolve the widget-level keys:

| Key | Default |
|---|---|
| `WIDGET_MAX_MESSAGES_PER_SESSION` | 100 |
| `WIDGET_SHOW_POWERED_BY` | true |
| `WIDGET_ENABLE_FILE_UPLOAD` | false |
| `WIDGET_ENABLE_VOICE_INPUT` | false |
| `WIDGET_PRIMARY_COLOR` | (from brand) |
| `WIDGET_SURFACE_COLOR` | (from brand) |
| `WIDGET_FONT_FAMILY` | 'Inter, system-ui' |
| `WIDGET_MAX_CHAR_LIMIT` | 2000 |
| `WIDGET_SESSION_TTL_HOURS` | 24 |
| `WIDGET_DEFAULT_LAYOUT` | 'inline' |
| `PLAYGROUND_DEFAULT_AGENT` | '' |

Resolution uses the 3-tier cascade (platform → module → tenant)
documented in `docs/modules/config/module-design.md`.

---

## Error envelope

Every endpoint returns the OVEN standard error envelope on failure:

```json
{
  "error": {
    "message": "...",
    "code": "...",
    "details": { ... }
  }
}
```

`useChat`, `useTenantConfig`, and `useSessionPersistence` map these
into `<ChatErrorCard>` props. Nothing else in the package catches.
