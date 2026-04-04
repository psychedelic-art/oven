# API Reference: module-chat

> All 9 endpoints with request/response schemas, authentication, and SSE streaming format.

---

## Endpoint Summary

| # | Method | Route | Auth | Purpose |
|---|--------|-------|------|---------|
| 1 | GET | `/api/chat-sessions` | Auth | List sessions |
| 2 | POST | `/api/chat-sessions` | Flexible | Create session (auth or anonymous) |
| 3 | GET | `/api/chat-sessions/[id]` | Flexible | Get session with recent messages |
| 4 | DELETE | `/api/chat-sessions/[id]` | Auth | Archive session |
| 5 | GET | `/api/chat-sessions/[id]/messages` | Flexible | List messages in session |
| 6 | POST | `/api/chat-sessions/[id]/messages` | Flexible | Send message (streaming) |
| 7 | GET | `/api/chat-sessions/[id]/actions` | Auth | List tool actions |
| 8 | GET | `/api/chat-analytics` | Auth | Analytics list |
| 9 | GET | `/api/chat-analytics/summary` | Auth | Aggregated analytics |

**Auth modes**:
- **Auth**: Requires valid JWT/session cookie. User identified via `x-user-id` header from auth middleware.
- **Flexible**: Accepts either auth cookie (authenticated session) OR `X-Session-Token` header (anonymous session). Anonymous access is restricted to the session matching the token.

---

## 1. GET /api/chat-sessions

List chat sessions with filtering, sorting, and pagination.

**Auth**: Required (dashboard users). Returns sessions for the user's tenant(s).

**Query Parameters** (React Admin format):
| Param | Type | Description |
|-------|------|-------------|
| `sort` | `["field","ASC\|DESC"]` | Sort field and direction |
| `range` | `[start, end]` | Pagination range |
| `filter` | JSON | Filter object |

**Filter fields**:
| Field | Type | Description |
|-------|------|-------------|
| `tenantId` | number | Filter by tenant |
| `agentId` | number | Filter by backing agent |
| `status` | string | `active`, `escalated`, `closed`, `archived` |
| `channel` | string | `web`, `widget`, `portal`, `whatsapp` |
| `userId` | number | Filter by user (admin only) |
| `q` | string | Full-text search on title |

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "tenantId": 5,
    "agentId": 3,
    "userId": 12,
    "sessionToken": null,
    "channel": "web",
    "title": "Question about services",
    "status": "active",
    "context": { "referencedEntities": [] },
    "metadata": { "userAgent": "Mozilla/5.0..." },
    "createdAt": "2026-03-15T10:30:00Z",
    "updatedAt": "2026-03-15T10:45:00Z"
  }
]
```

**Headers**: `Content-Range: chat-sessions 0-24/42`

---

## 2. POST /api/chat-sessions

Create a new chat session. Supports both authenticated and anonymous creation.

**Auth**: Flexible.

**Request Body (authenticated)**:
```json
{
  "agentSlug": "dental-assistant",
  "channel": "web",
  "title": "Optional session title"
}
```

**Request Body (anonymous/widget)**:
```json
{
  "tenantSlug": "clinica-xyz",
  "channel": "widget"
}
```

**Agent resolution order**:
1. Explicit `agentSlug` in request body
2. Tenant-configured default (`DEFAULT_AGENT_SLUG` from module-config)
3. Platform default agent

**Response**: `201 Created`

Authenticated:
```json
{
  "id": 42,
  "tenantId": 5,
  "agentId": 3,
  "userId": 12,
  "sessionToken": null,
  "channel": "web",
  "title": null,
  "status": "active",
  "context": {},
  "metadata": {},
  "createdAt": "2026-03-15T10:30:00Z",
  "updatedAt": "2026-03-15T10:30:00Z"
}
```

Anonymous:
```json
{
  "id": 43,
  "tenantId": 5,
  "agentId": 3,
  "userId": null,
  "sessionToken": "a1b2c3d4...128chars",
  "channel": "widget",
  "title": null,
  "status": "active",
  "context": {},
  "metadata": { "userAgent": "...", "referrer": "https://clinica-xyz.com/services" },
  "createdAt": "2026-03-15T10:30:00Z",
  "updatedAt": "2026-03-15T10:30:00Z"
}
```

**Errors**:
- `400 Bad Request`: Missing tenantSlug for anonymous session
- `404 Not Found`: Tenant or agent not found
- `403 Forbidden`: `ANONYMOUS_SESSIONS_ENABLED` is false for the tenant (anonymous only)

**Public endpoint**: Anonymous creation is marked `isPublic` in `api_endpoint_permissions`.

---

## 3. GET /api/chat-sessions/[id]

Get a single session with its most recent messages.

**Auth**: Flexible. Authenticated users must own the session or have admin access. Anonymous users must provide matching `X-Session-Token`.

**Response**: `200 OK`
```json
{
  "id": 42,
  "tenantId": 5,
  "agentId": 3,
  "userId": 12,
  "channel": "web",
  "title": "Question about services",
  "status": "active",
  "context": { "referencedEntities": ["service:limpieza"] },
  "metadata": {},
  "createdAt": "2026-03-15T10:30:00Z",
  "updatedAt": "2026-03-15T10:45:00Z",
  "recentMessages": [
    {
      "id": 101,
      "role": "user",
      "content": [{ "type": "text", "text": "What services do you offer?" }],
      "createdAt": "2026-03-15T10:31:00Z"
    },
    {
      "id": 102,
      "role": "assistant",
      "content": [{ "type": "text", "text": "We offer the following services..." }],
      "toolCalls": [{ "toolCallId": "tc_1", "toolName": "kb.searchEntries", "input": {"query": "services"} }],
      "metadata": { "model": "gpt-4o-mini", "tokens": 245, "latencyMs": 1200, "cost": 0.003 },
      "createdAt": "2026-03-15T10:31:02Z"
    }
  ],
  "agent": {
    "id": 3,
    "name": "Dental Assistant",
    "slug": "dental-assistant"
  }
}
```

**Errors**:
- `404 Not Found`: Session does not exist
- `403 Forbidden`: User does not own the session / token mismatch

---

## 4. DELETE /api/chat-sessions/[id]

Archive a session (soft delete). Sets status to `archived`.

**Auth**: Required. User must own the session or have admin access.

**Response**: `200 OK`
```json
{
  "id": 42,
  "status": "archived"
}
```

**Side effects**:
- Emits `chat.session.closed` event (if not already closed)
- Final analytics computation

---

## 5. GET /api/chat-sessions/[id]/messages

List messages in a session with pagination.

**Auth**: Flexible.

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `sort` | `["createdAt","ASC"]` | Sort (default: ascending by createdAt) |
| `range` | `[0, 49]` | Pagination range |

**Response**: `200 OK`
```json
[
  {
    "id": 101,
    "sessionId": 42,
    "role": "user",
    "content": [{ "type": "text", "text": "What are your hours?" }],
    "toolCalls": null,
    "toolResults": null,
    "metadata": {},
    "createdAt": "2026-03-15T10:31:00Z"
  },
  {
    "id": 102,
    "sessionId": 42,
    "role": "assistant",
    "content": [{ "type": "text", "text": "Our office hours are Monday through Friday, 9 AM to 6 PM." }],
    "toolCalls": [
      {
        "toolCallId": "tc_1",
        "toolName": "kb.searchEntries",
        "input": { "query": "horarios" },
        "output": { "entries": [{ "question": "Horarios", "answer": "Lunes a Viernes 9-18h" }] }
      }
    ],
    "metadata": { "model": "gpt-4o-mini", "tokens": 187, "latencyMs": 980, "cost": 0.002 },
    "createdAt": "2026-03-15T10:31:02Z"
  }
]
```

**Headers**: `Content-Range: chat-messages 0-49/12`

---

## 6. POST /api/chat-sessions/[id]/messages

**The critical path.** Send a user message, invoke the backing agent, and stream the response.

**Auth**: Flexible. Public endpoint for anonymous sessions.

**Request Body**:
```json
{
  "content": [
    { "type": "text", "text": "What services do you offer?" }
  ]
}
```

With file attachment:
```json
{
  "content": [
    { "type": "text", "text": "What is this?" },
    { "type": "image", "url": "https://files.oven.app/uploads/abc123.jpg" }
  ]
}
```

**Response**: `200 OK` with `Content-Type: text/event-stream`

### SSE Event Format

Each event follows the standard SSE format:

```
event: {eventType}
data: {jsonPayload}

```

(Two newlines after each event.)

### Event Types

#### `token`
Emitted for each generated token. The primary event for streaming text display.
```
event: token
data: {"text":"Our "}

event: token
data: {"text":"office "}

event: token
data: {"text":"hours "}
```

#### `toolCallStart`
Emitted when the agent begins a tool invocation.
```
event: toolCallStart
data: {"toolCallId":"tc_abc123","toolName":"kb.searchEntries","input":{"query":"services","tenantId":5}}
```

#### `toolCallEnd`
Emitted when tool execution completes.
```
event: toolCallEnd
data: {"toolCallId":"tc_abc123","output":{"entries":[{"question":"Services","answer":"..."}]},"durationMs":45,"status":"success"}
```

Error case:
```
event: toolCallEnd
data: {"toolCallId":"tc_abc123","output":null,"durationMs":120,"status":"error","error":"Knowledge base search failed"}
```

#### `done`
Emitted after the full response is recorded in the database.
```
event: done
data: {"messageId":102,"metadata":{"model":"gpt-4o-mini","tokens":245,"latencyMs":1200,"cost":0.003}}
```

#### `error`
Emitted on unrecoverable errors. The connection is closed after this event.
```
event: error
data: {"code":"AGENT_INVOCATION_FAILED","message":"The backing agent is unavailable"}
```

```
event: error
data: {"code":"RATE_LIMIT_EXCEEDED","message":"Too many messages. Try again in 30 seconds.","retryAfter":30}
```

```
event: error
data: {"code":"SESSION_CLOSED","message":"This session has been closed"}
```

### Processing Pipeline

```
Request received
  1. Validate session state (active or escalated)
  2. Validate X-Session-Token (anonymous) or auth cookie
  3. Check rate limit (per session + per IP)
  4. Validate content format
  5. Insert user message (role: 'user') into chat_messages
  6. Load message history (configurable context window)
  7. Resolve agent for session
  8. Invoke agent-core (POST /api/agents/[slug]/invoke)
  9. Stream SSE events to client
  10. On stream complete: insert assistant message, tool actions
  11. Update chat_analytics
  12. Check escalation triggers
  13. Emit 'done' event
```

**Errors**:
- `403 Forbidden`: Session is closed/archived, or token mismatch
- `429 Too Many Requests`: Rate limit exceeded (includes `Retry-After` header)
- `400 Bad Request`: Invalid content format

---

## 7. GET /api/chat-sessions/[id]/actions

List tool actions executed within a session.

**Auth**: Required. Admin access to view actions.

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "sessionId": 42,
    "messageId": 102,
    "toolName": "kb.searchEntries",
    "moduleName": "knowledge-base",
    "input": { "query": "services" },
    "output": { "entries": [{ "id": 1, "question": "Services" }] },
    "status": "success",
    "durationMs": 45,
    "createdAt": "2026-03-15T10:31:01Z"
  }
]
```

**Headers**: `Content-Range: chat-actions 0-24/5`

---

## 8. GET /api/chat-analytics

List session-level analytics records.

**Auth**: Required. Filtered by tenant.

**Filter fields**:
| Field | Type | Description |
|-------|------|-------------|
| `tenantId` | number | Filter by tenant |
| `escalated` | boolean | Filter escalated sessions |
| `createdAt_gte` | string (ISO date) | Sessions created after date |
| `createdAt_lte` | string (ISO date) | Sessions created before date |

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "sessionId": 42,
    "tenantId": 5,
    "durationSeconds": 900,
    "messageCount": 12,
    "userMessageCount": 6,
    "totalTokens": 3450,
    "totalCostCents": 5,
    "escalated": false,
    "satisfactionScore": 4,
    "createdAt": "2026-03-15T10:30:00Z"
  }
]
```

**Headers**: `Content-Range: chat-analytics 0-24/150`

---

## 9. GET /api/chat-analytics/summary

Aggregated analytics per tenant.

**Auth**: Required.

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| `tenantId` | number | Required. Tenant to summarize. |
| `from` | string (ISO date) | Start date (default: 30 days ago) |
| `to` | string (ISO date) | End date (default: now) |

**Response**: `200 OK`
```json
{
  "tenantId": 5,
  "period": { "from": "2026-02-15", "to": "2026-03-15" },
  "totalSessions": 150,
  "averageDurationSeconds": 420,
  "averageMessageCount": 8,
  "totalTokens": 125000,
  "totalCostCents": 180,
  "escalationRate": 0.12,
  "averageSatisfaction": 4.2,
  "channelBreakdown": {
    "widget": 120,
    "web": 25,
    "portal": 5
  }
}
```

---

## MCP Tool Definitions

module-chat registers the following action schemas in its `chat` block for agent discovery:

| Action | Description | Endpoint |
|--------|-------------|----------|
| `chat.listSessions` | List chat sessions with filters | `GET /api/chat-sessions` |
| `chat.createSession` | Create a new chat session | `POST /api/chat-sessions` |
| `chat.sendMessage` | Send a message to a session | `POST /api/chat-sessions/[id]/messages` |
| `chat.getAnalyticsSummary` | Get aggregated chat analytics | `GET /api/chat-analytics/summary` |

These allow other agents in the system to programmatically interact with chat sessions (e.g., a workflow agent that creates a chat session as part of a customer onboarding flow).
