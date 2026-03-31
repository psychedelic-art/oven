# Database Design: module-chat

> 4 tables with column-level detail, JSONB structure examples, and data flow explanations.

---

## Table Overview

| Table | Purpose | Rows/Session |
|-------|---------|-------------|
| `chat_sessions` | Session lifecycle, auth, channel | 1 |
| `chat_messages` | Conversation history (all roles) | N (typically 2-100) |
| `chat_actions` | Tool call records (denormalized from messages) | 0-M per message |
| `chat_analytics` | Session-level aggregated metrics | 1 |

---

## 1. chat_sessions

Session records for both authenticated and anonymous users.

```sql
CREATE TABLE chat_sessions (
  id              SERIAL PRIMARY KEY,
  tenant_id       INTEGER NOT NULL,
  agent_id        INTEGER,
  user_id         INTEGER,
  session_token   VARCHAR(128),
  channel         VARCHAR(32) NOT NULL,
  title           VARCHAR(255),
  status          VARCHAR(32) NOT NULL DEFAULT 'active',
  context         JSONB NOT NULL DEFAULT '{}',
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | serial | No | Primary key |
| `tenant_id` | integer | No | Owning tenant. Plain integer (no FK reference per module rules). Indexed. |
| `agent_id` | integer | Yes | Backing agent ID (from module-agent-core agents table). Null if using platform default. |
| `user_id` | integer | Yes | Authenticated user ID. Null for anonymous sessions. |
| `session_token` | varchar(128) | Yes | Server-generated token for anonymous sessions. Null for authenticated sessions. |
| `channel` | varchar(32) | No | Origin channel. Enum: `web` (dashboard), `widget` (external site), `portal` (tenant portal), `whatsapp` (future). |
| `title` | varchar(255) | Yes | Session title. Auto-generated from first message or user-set. |
| `status` | varchar(32) | No | Session lifecycle state. Values: `active`, `escalated`, `closed`, `archived`. Default: `active`. |
| `context` | jsonb | No | Accumulated session context. Updated by the agent after each turn. |
| `metadata` | jsonb | No | Session-level metadata (userAgent, referrer, tenant config snapshot). |
| `created_at` | timestamp | No | Session creation time |
| `updated_at` | timestamp | No | Last activity time (updated on each message) |

### Indexes

```sql
CREATE INDEX cs_tenant_id_idx ON chat_sessions (tenant_id);
CREATE INDEX cs_user_id_idx ON chat_sessions (user_id);
CREATE INDEX cs_agent_id_idx ON chat_sessions (agent_id);
CREATE INDEX cs_status_idx ON chat_sessions (status);
CREATE INDEX cs_channel_idx ON chat_sessions (channel);
CREATE INDEX cs_session_token_idx ON chat_sessions (session_token) WHERE session_token IS NOT NULL;
```

The partial index on `session_token` (WHERE NOT NULL) efficiently serves anonymous session lookups without indexing null values.

### Drizzle Schema

```typescript
export const chatSessions = pgTable('chat_sessions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id').notNull(),
  agentId: integer('agent_id'),
  userId: integer('user_id'),
  sessionToken: varchar('session_token', { length: 128 }),
  channel: varchar('channel', { length: 32 }).notNull(),
  title: varchar('title', { length: 255 }),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  context: jsonb('context').notNull().default({}),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('cs_tenant_id_idx').on(table.tenantId),
  index('cs_user_id_idx').on(table.userId),
  index('cs_agent_id_idx').on(table.agentId),
  index('cs_status_idx').on(table.status),
  index('cs_channel_idx').on(table.channel),
]);
```

### Context JSONB Example

```json
{
  "referencedEntities": [
    { "type": "service", "name": "Limpieza dental", "id": 12 },
    { "type": "schedule", "day": "Monday" }
  ],
  "userIntent": "appointment_scheduling",
  "language": "es"
}
```

### Metadata JSONB Example

```json
{
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
  "referrer": "https://clinica-xyz.com/services",
  "tenantConfig": {
    "welcomeMessage": "Hola! Como podemos ayudarte?",
    "agentSlug": "dental-assistant"
  }
}
```

---

## 2. chat_messages

Individual messages in a session. Supports multimodal content via parts-based JSONB.

```sql
CREATE TABLE chat_messages (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL,
  role            VARCHAR(32) NOT NULL,
  content         JSONB NOT NULL,
  tool_calls      JSONB,
  tool_results    JSONB,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | serial | No | Primary key |
| `session_id` | integer | No | Parent session. Indexed. |
| `role` | varchar(32) | No | Message author role: `user`, `assistant`, `system`, `tool` |
| `content` | jsonb | No | Parts-based content array (see structure below) |
| `tool_calls` | jsonb | Yes | Tool calls made by the assistant in this turn. Null for non-assistant roles. |
| `tool_results` | jsonb | Yes | Results from tool execution. Null for non-tool roles. |
| `metadata` | jsonb | No | Per-message metadata (model, tokens, latency, cost). Empty for user messages. |
| `created_at` | timestamp | No | Message timestamp |

### Indexes

```sql
CREATE INDEX cm_session_id_idx ON chat_messages (session_id);
CREATE INDEX cm_session_id_created_idx ON chat_messages (session_id, created_at);
CREATE INDEX cm_role_idx ON chat_messages (role);
```

The composite index `(session_id, created_at)` serves the common query pattern of loading the last N messages in a session.

### Content JSONB Structure

The `content` field is always an array of parts. Each part has a `type` discriminator.

**Text message (most common)**:
```json
[
  { "type": "text", "text": "What services do you offer?" }
]
```

**Image message**:
```json
[
  { "type": "text", "text": "What is this?" },
  { "type": "image", "url": "https://files.oven.app/uploads/abc123.jpg", "alt": "Uploaded photo" }
]
```

**File message**:
```json
[
  { "type": "text", "text": "Please review this document" },
  { "type": "file", "url": "https://files.oven.app/uploads/report.pdf", "name": "report.pdf", "mimeType": "application/pdf" }
]
```

**System message**:
```json
[
  { "type": "text", "text": "Session escalated to human support. Contact: +57 300 123 4567" }
]
```

### Tool Calls JSONB Structure

Stored on assistant messages that include tool invocations:

```json
[
  {
    "toolCallId": "tc_abc123",
    "toolName": "kb.searchEntries",
    "input": { "query": "horarios", "tenantId": 5 }
  },
  {
    "toolCallId": "tc_def456",
    "toolName": "tenants.getSchedule",
    "input": { "tenantSlug": "clinica-xyz" }
  }
]
```

### Tool Results JSONB Structure

Stored on tool-role messages that provide results:

```json
[
  {
    "toolCallId": "tc_abc123",
    "output": {
      "entries": [
        { "id": 1, "question": "Horarios de atencion", "answer": "Lunes a Viernes 9:00-18:00" }
      ]
    },
    "status": "success"
  }
]
```

### Metadata JSONB Structure (Assistant Messages)

```json
{
  "model": "gpt-4o-mini",
  "tokens": 245,
  "promptTokens": 180,
  "completionTokens": 65,
  "latencyMs": 1200,
  "cost": 0.003,
  "aborted": false
}
```

---

## 3. chat_actions

Denormalized tool call records for efficient querying. One row per tool invocation.

```sql
CREATE TABLE chat_actions (
  id              SERIAL PRIMARY KEY,
  session_id      INTEGER NOT NULL,
  message_id      INTEGER NOT NULL,
  tool_name       VARCHAR(128) NOT NULL,
  module_name     VARCHAR(64),
  input           JSONB NOT NULL,
  output          JSONB,
  status          VARCHAR(32) NOT NULL,
  duration_ms     INTEGER,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | serial | No | Primary key |
| `session_id` | integer | No | Parent session. Indexed. |
| `message_id` | integer | No | Parent message. Indexed. |
| `tool_name` | varchar(128) | No | Fully qualified tool name (e.g., `kb.searchEntries`) |
| `module_name` | varchar(64) | Yes | Module that owns the tool (e.g., `knowledge-base`). Null for built-in tools. |
| `input` | jsonb | No | Parameters sent to the tool |
| `output` | jsonb | Yes | Result from tool execution. Null if the tool errored before returning. |
| `status` | varchar(32) | No | `success` or `error` |
| `duration_ms` | integer | Yes | Execution time in milliseconds |
| `created_at` | timestamp | No | Execution timestamp |

### Indexes

```sql
CREATE INDEX ca_session_id_idx ON chat_actions (session_id);
CREATE INDEX ca_message_id_idx ON chat_actions (message_id);
CREATE INDEX ca_tool_name_idx ON chat_actions (tool_name);
CREATE INDEX ca_module_name_idx ON chat_actions (module_name);
CREATE INDEX ca_status_idx ON chat_actions (status);
```

### Why Denormalize?

Tool calls are already stored inside `chat_messages.toolCalls` and `chat_messages.toolResults`. The `chat_actions` table exists for:
- Fast querying of tool usage patterns across sessions (which tools are used most, error rates)
- Analytics on tool performance (average duration per tool)
- Audit trail (who invoked what, with which parameters)
- Admin dashboard views that list tool invocations across sessions

---

## 4. chat_analytics

Session-level aggregated metrics. One row per session.

```sql
CREATE TABLE chat_analytics (
  id                  SERIAL PRIMARY KEY,
  session_id          INTEGER NOT NULL UNIQUE,
  tenant_id           INTEGER NOT NULL,
  duration_seconds    INTEGER,
  message_count       INTEGER,
  user_message_count  INTEGER,
  total_tokens        INTEGER,
  total_cost_cents    INTEGER,
  escalated           BOOLEAN NOT NULL DEFAULT FALSE,
  satisfaction_score  INTEGER,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | serial | No | Primary key |
| `session_id` | integer | No | Parent session. Unique constraint (one analytics row per session). |
| `tenant_id` | integer | No | Owning tenant. Indexed for per-tenant aggregation queries. |
| `duration_seconds` | integer | Yes | Time from session creation to last message. Updated on each message. |
| `message_count` | integer | Yes | Total messages in session (all roles). |
| `user_message_count` | integer | Yes | Messages with role='user' only. |
| `total_tokens` | integer | Yes | Sum of tokens used across all assistant messages. |
| `total_cost_cents` | integer | Yes | Estimated cost in cents. |
| `escalated` | boolean | No | True if the session was ever escalated. |
| `satisfaction_score` | integer | Yes | 1-5 rating from user. Null until rated. |
| `created_at` | timestamp | No | Analytics record creation time. |

### Indexes

```sql
CREATE UNIQUE INDEX can_session_id_idx ON chat_analytics (session_id);
CREATE INDEX can_tenant_id_idx ON chat_analytics (tenant_id);
CREATE INDEX can_created_at_idx ON chat_analytics (created_at);
CREATE INDEX can_escalated_idx ON chat_analytics (escalated);
```

---

## 5. Anonymous vs Authenticated Session Flow at DB Level

### Authenticated Session

```
POST /api/chat-sessions (with auth cookie)
  |
  v
INSERT INTO chat_sessions (
  tenant_id = auth.tenantId,     -- from auth middleware
  user_id = auth.userId,          -- from auth middleware
  session_token = NULL,           -- not used for auth sessions
  channel = 'web',
  status = 'active',
  agent_id = resolved_agent_id
)
  |
  v
Subsequent requests validated by:
  WHERE id = :sessionId
  AND user_id = :authUserId
```

### Anonymous Session

```
POST /api/chat-sessions (no auth, with tenantSlug)
  |
  v
Generate sessionToken = crypto.randomBytes(64).toString('hex')  -- 128 chars
  |
  v
INSERT INTO chat_sessions (
  tenant_id = tenant.id,          -- looked up from tenantSlug
  user_id = NULL,                 -- no user for anonymous
  session_token = generated_token,
  channel = 'widget',
  status = 'active',
  agent_id = resolved_agent_id
)
  |
  v
Return { id, sessionToken } to client
Client stores sessionToken in localStorage
  |
  v
Subsequent requests validated by:
  WHERE id = :sessionId
  AND session_token = :headerToken    -- from X-Session-Token header
```

### Key Differences

| Aspect | Authenticated | Anonymous |
|--------|--------------|-----------|
| `user_id` | Populated from JWT/cookie | NULL |
| `session_token` | NULL | 128-char random string |
| Validation | `user_id` match | `session_token` match |
| Session listing | User can list all their sessions | No listing (single session access only) |
| Channel | Typically `web` or `portal` | Typically `widget` |
| PII | Linked to user account | No PII stored |

---

## 6. Data Volume Estimates

For a typical tenant with moderate traffic:

| Table | Rows/Month | Growth Pattern |
|-------|-----------|---------------|
| `chat_sessions` | ~500 | 1 per conversation |
| `chat_messages` | ~4,000 | ~8 messages per session average |
| `chat_actions` | ~2,000 | ~4 tool calls per session average |
| `chat_analytics` | ~500 | 1 per session |

The `chat_messages` table is the highest volume table. The composite index `(session_id, created_at)` is critical for the message-loading query pattern.

For archival, sessions older than a configurable retention period (default: 90 days) can be moved to a cold storage table or deleted.
