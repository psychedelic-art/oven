# Module Agent Core -- Database Schema

> 6 tables with column-level detail, indexes, relationships, and JSONB structure definitions.

---

## Entity Relationship Diagram

```
  agents
    |
    +--< agent_versions          (1:N - version snapshots)
    |
    +--< agent_sessions          (1:N - conversations)
    |       |
    |       +--< agent_messages  (1:N - messages in session)
    |       |
    |       +--< agent_executions (1:N - invocation logs)
    |               |
    |               +--- agent_messages (1:1 - linked response message)
    |
    +--- (optional) workflow_agent_definitions (FK via workflowAgentId)

  agent_node_definitions         (standalone - node library)
```

---

## Table: `agents`

Agent definitions -- the core CRUD entity. Each row represents a persistent, configurable AI agent.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto | Primary key |
| `tenant_id` | `integer` | Yes | `null` | Owning tenant. Null = platform-wide agent. |
| `name` | `varchar(255)` | No | -- | Human-readable name |
| `slug` | `varchar(128)` | No | -- | URL-safe identifier. Unique. |
| `description` | `text` | Yes | `null` | What this agent does |
| `llm_config` | `jsonb` | No | -- | LLM provider, model, and parameters (see JSONB detail below) |
| `system_prompt` | `text` | No | -- | Base system instructions. Supports `{{variable}}` substitution. |
| `exposed_params` | `jsonb` | No | `'[]'` | Array of LLM config field names overridable at invocation |
| `tool_bindings` | `jsonb` | No | `'[]'` | Array of tool name strings this agent can use |
| `input_config` | `jsonb` | No | `'{"modalities":["text"]}'` | Accepted input modalities and constraints |
| `workflow_agent_id` | `integer` | Yes | `null` | FK to workflow-agent graph (plain integer, no Drizzle ref) |
| `metadata` | `jsonb` | Yes | `null` | Arbitrary key-value metadata |
| `enabled` | `boolean` | No | `true` | Whether the agent can be invoked |
| `version` | `integer` | No | `1` | Current version number. Auto-incremented on behavioral changes. |
| `created_at` | `timestamp` | No | `now()` | Creation timestamp |
| `updated_at` | `timestamp` | No | `now()` | Last modification timestamp |

**Indexes:**

```sql
CREATE INDEX agents_tenant_id_idx ON agents (tenant_id);
CREATE UNIQUE INDEX agents_slug_idx ON agents (slug);
CREATE INDEX agents_enabled_idx ON agents (enabled);
```

**Drizzle definition:**

```typescript
export const agents = pgTable('agents', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  llmConfig: jsonb('llm_config').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  exposedParams: jsonb('exposed_params').notNull().default('[]'),
  toolBindings: jsonb('tool_bindings').notNull().default('[]'),
  inputConfig: jsonb('input_config').notNull().default('{"modalities":["text"]}'),
  workflowAgentId: integer('workflow_agent_id'),
  metadata: jsonb('metadata'),
  enabled: boolean('enabled').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('agents_tenant_id_idx').on(table.tenantId),
  index('agents_enabled_idx').on(table.enabled),
]);
```

### JSONB: `llm_config`

```typescript
{
  provider: string;           // "openai" | "anthropic" | "google"
  model: string;              // Alias ("fast", "smart") or direct ID ("gpt-4o-mini")
  temperature: number;        // 0.0 - 2.0
  maxTokens: number;          // 1 - 128000
  topP?: number;              // 0.0 - 1.0 (default 1.0)
  frequencyPenalty?: number;  // -2.0 - 2.0 (default 0)
  presencePenalty?: number;   // -2.0 - 2.0 (default 0)
  stopSequences?: string[];   // Optional stop sequences
}
```

### JSONB: `exposed_params`

```typescript
string[]
// Example: ["temperature", "maxTokens", "model"]
// Valid values: "provider", "model", "temperature", "maxTokens", "topP",
//              "frequencyPenalty", "presencePenalty"
```

### JSONB: `tool_bindings`

```typescript
string[]
// Example: ["kb.searchEntries", "kb.getEntry", "ai.embed"]
// Each string is a tool name from the ToolRegistry (module.resource.action format)
```

### JSONB: `input_config`

```typescript
{
  modalities: ('text' | 'image' | 'audio')[];
  maxImageSize?: number;       // Max image size in bytes (default: 10MB)
  maxAudioDuration?: number;   // Max audio duration in seconds (default: 120)
}
```

---

## Table: `agent_versions`

Version history snapshots. A new row is created whenever a behavioral field on the `agents` table changes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto | Primary key |
| `agent_id` | `integer` | No | -- | FK to `agents.id` (plain integer) |
| `version` | `integer` | No | -- | Version number at time of snapshot |
| `definition` | `jsonb` | No | -- | Full snapshot of agent config at this version |
| `description` | `text` | Yes | `null` | Optional changelog note |
| `created_at` | `timestamp` | No | `now()` | When this snapshot was created |

**Indexes:**

```sql
CREATE INDEX av_agent_id_idx ON agent_versions (agent_id);
CREATE UNIQUE INDEX av_agent_version_idx ON agent_versions (agent_id, version);
```

**Drizzle definition:**

```typescript
export const agentVersions = pgTable('agent_versions', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull(),
  version: integer('version').notNull(),
  definition: jsonb('definition').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('av_agent_id_idx').on(table.agentId),
  unique('av_agent_version_idx').on(table.agentId, table.version),
]);
```

### JSONB: `definition`

Full snapshot of the agent at the time of versioning:

```typescript
{
  llmConfig: { ... };          // Full llm_config at that version
  systemPrompt: string;
  exposedParams: string[];
  toolBindings: string[];
  inputConfig: { ... };
  workflowAgentId: number | null;
}
```

---

## Table: `agent_node_definitions`

Reusable node library. Declarative specifications for graph node types.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto | Primary key |
| `name` | `varchar(255)` | No | -- | Human-readable label |
| `slug` | `varchar(128)` | No | -- | Unique identifier |
| `category` | `varchar(50)` | No | -- | Node category (see enum below) |
| `description` | `text` | Yes | `null` | What this node does |
| `inputs` | `jsonb` | No | `'[]'` | Array of input parameter declarations |
| `outputs` | `jsonb` | No | `'[]'` | Array of output parameter declarations |
| `config` | `jsonb` | No | `'{}'` | Default configuration schema |
| `is_system` | `boolean` | No | `false` | System nodes cannot be deleted via API |
| `created_at` | `timestamp` | No | `now()` | Creation timestamp |
| `updated_at` | `timestamp` | No | `now()` | Last modification timestamp |

**Category enum values:** `llm`, `tool`, `condition`, `transform`, `human-in-the-loop`, `memory`

**Indexes:**

```sql
CREATE UNIQUE INDEX and_slug_idx ON agent_node_definitions (slug);
CREATE INDEX and_category_idx ON agent_node_definitions (category);
CREATE INDEX and_is_system_idx ON agent_node_definitions (is_system);
```

**Drizzle definition:**

```typescript
export const agentNodeDefinitions = pgTable('agent_node_definitions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  inputs: jsonb('inputs').notNull().default('[]'),
  outputs: jsonb('outputs').notNull().default('[]'),
  config: jsonb('config').notNull().default('{}'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('and_category_idx').on(table.category),
  index('and_is_system_idx').on(table.isSystem),
]);
```

### JSONB: `inputs` / `outputs`

```typescript
{
  name: string;          // Parameter name
  type: string;          // "string" | "number" | "boolean" | "array" | "object"
  description?: string;  // Human-readable description
  required?: boolean;    // Default false
}[]
```

### JSONB: `config`

Default configuration schema for the node type:

```typescript
{
  [key: string]: {
    type: string;         // "string" | "number" | "boolean"
    default?: any;        // Default value
    description?: string; // Help text
    enum?: string[];      // Allowed values
  }
}
```

---

## Table: `agent_sessions`

Conversation sessions with agents. Each session contains an ordered sequence of messages.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto | Primary key |
| `tenant_id` | `integer` | Yes | `null` | Tenant scope (inherited from agent or user) |
| `agent_id` | `integer` | No | -- | FK to `agents.id` (plain integer) |
| `user_id` | `integer` | No | -- | Who initiated the session (plain integer FK) |
| `title` | `varchar(255)` | Yes | `null` | Auto-generated from first user message or user-set |
| `context` | `jsonb` | No | `'{}'` | Accumulated session context and state checkpoints |
| `status` | `varchar(20)` | No | `'active'` | Session status: `active` or `archived` |
| `is_playground` | `boolean` | No | `false` | Whether this is a playground test session |
| `created_at` | `timestamp` | No | `now()` | Creation timestamp |
| `updated_at` | `timestamp` | No | `now()` | Last modification timestamp |

**Indexes:**

```sql
CREATE INDEX as_tenant_id_idx ON agent_sessions (tenant_id);
CREATE INDEX as_agent_id_idx ON agent_sessions (agent_id);
CREATE INDEX as_user_id_idx ON agent_sessions (user_id);
CREATE INDEX as_status_idx ON agent_sessions (status);
```

**Drizzle definition:**

```typescript
export const agentSessions = pgTable('agent_sessions', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  agentId: integer('agent_id').notNull(),
  userId: integer('user_id').notNull(),
  title: varchar('title', { length: 255 }),
  context: jsonb('context').notNull().default('{}'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  isPlayground: boolean('is_playground').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('as_tenant_id_idx').on(table.tenantId),
  index('as_agent_id_idx').on(table.agentId),
  index('as_user_id_idx').on(table.userId),
  index('as_status_idx').on(table.status),
]);
```

### JSONB: `context`

```typescript
{
  // LangGraph checkpoint data
  checkpoint?: {
    nodeId: string;
    stepIndex: number;
    state: Record<string, unknown>;
  };
  // Referenced entities during conversation
  referencedEntities?: {
    type: string;    // "kb-entry", "map", "patient"
    id: number;
    label: string;
  }[];
  // User preferences learned during session
  preferences?: Record<string, unknown>;
}
```

---

## Table: `agent_messages`

Individual messages within a session. Stores user inputs, assistant responses, system messages, and tool interactions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto | Primary key |
| `session_id` | `integer` | No | -- | FK to `agent_sessions.id` (plain integer) |
| `role` | `varchar(20)` | No | -- | Message role: `user`, `assistant`, `system`, `tool` |
| `content` | `jsonb` | No | -- | Parts-based content array (text, image, audio) |
| `tool_calls` | `jsonb` | Yes | `null` | Tool calls made by the assistant in this message |
| `tool_results` | `jsonb` | Yes | `null` | Results returned by tool execution |
| `metadata` | `jsonb` | No | `'{}'` | Per-message metadata (model, tokens, cost) |
| `created_at` | `timestamp` | No | `now()` | Message timestamp |

**Indexes:**

```sql
CREATE INDEX am_session_id_idx ON agent_messages (session_id);
CREATE INDEX am_role_idx ON agent_messages (role);
```

**Drizzle definition:**

```typescript
export const agentMessages = pgTable('agent_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: jsonb('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  toolResults: jsonb('tool_results'),
  metadata: jsonb('metadata').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('am_session_id_idx').on(table.sessionId),
  index('am_role_idx').on(table.role),
]);
```

### JSONB: `content`

Parts-based message content:

```typescript
(
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl?: string; imageBase64?: string; mimeType: string }
  | { type: 'audio'; audioBase64: string; mimeType: string }
)[]
```

### JSONB: `tool_calls`

Tool calls made by the assistant:

```typescript
{
  id: string;           // "call_abc123"
  name: string;         // "kb.searchEntries"
  args: Record<string, unknown>;  // { query: "office hours" }
}[]
```

### JSONB: `tool_results`

Results from tool execution:

```typescript
{
  callId: string;       // Matches tool_calls[].id
  result: unknown;      // Tool response data
  error?: string;       // Error message if tool call failed
  latencyMs: number;    // Execution time
}[]
```

### JSONB: `metadata`

Per-message metadata:

```typescript
{
  model?: string;              // "gpt-4o-mini"
  tokens?: {
    input: number;
    output: number;
  };
  latencyMs?: number;
  cost?: number;               // Estimated cost in USD
}
```

---

## Table: `agent_executions`

Execution log for agent invocations. One row per invocation, regardless of success or failure.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto | Primary key |
| `agent_id` | `integer` | No | -- | FK to `agents.id` (plain integer) |
| `session_id` | `integer` | No | -- | FK to `agent_sessions.id` (plain integer) |
| `message_id` | `integer` | Yes | `null` | FK to `agent_messages.id` (the assistant response) |
| `status` | `varchar(20)` | No | `'running'` | Execution status: `running`, `completed`, `failed` |
| `llm_config` | `jsonb` | No | -- | Effective LLM config used (after param merges) |
| `tools_used` | `jsonb` | No | `'[]'` | Array of tool names invoked during execution |
| `token_usage` | `jsonb` | No | `'{}'` | Token consumption breakdown |
| `latency_ms` | `integer` | Yes | `null` | Total execution time in milliseconds |
| `error` | `text` | Yes | `null` | Error message (if status = failed) |
| `started_at` | `timestamp` | No | `now()` | Execution start time |
| `completed_at` | `timestamp` | Yes | `null` | Execution end time |

**Indexes:**

```sql
CREATE INDEX ae_agent_id_idx ON agent_executions (agent_id);
CREATE INDEX ae_session_id_idx ON agent_executions (session_id);
CREATE INDEX ae_status_idx ON agent_executions (status);
CREATE INDEX ae_started_at_idx ON agent_executions (started_at);
```

**Drizzle definition:**

```typescript
export const agentExecutions = pgTable('agent_executions', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull(),
  sessionId: integer('session_id').notNull(),
  messageId: integer('message_id'),
  status: varchar('status', { length: 20 }).notNull().default('running'),
  llmConfig: jsonb('llm_config').notNull(),
  toolsUsed: jsonb('tools_used').notNull().default('[]'),
  tokenUsage: jsonb('token_usage').notNull().default('{}'),
  latencyMs: integer('latency_ms'),
  error: text('error'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => [
  index('ae_agent_id_idx').on(table.agentId),
  index('ae_session_id_idx').on(table.sessionId),
  index('ae_status_idx').on(table.status),
  index('ae_started_at_idx').on(table.startedAt),
]);
```

### JSONB: `llm_config`

The effective configuration used for this execution (after parameter overrides):

```typescript
{
  provider: string;
  model: string;            // Resolved model ID (not alias)
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}
```

### JSONB: `tools_used`

```typescript
string[]
// Example: ["kb.searchEntries", "ai.embed"]
```

### JSONB: `token_usage`

```typescript
{
  input: number;    // Input/prompt tokens
  output: number;   // Output/completion tokens
  total: number;    // input + output
}
```

---

## Schema Summary

| Table | Rows (Expected) | Tenant-Scoped | Versioned | Key Indexes |
|-------|-----------------|---------------|-----------|-------------|
| `agents` | ~100s | Optional | Yes | slug (unique), tenantId, enabled |
| `agent_versions` | ~1000s | No (via agent) | -- | agentId, (agentId, version) unique |
| `agent_node_definitions` | ~10-50 | No (global) | No | slug (unique), category, isSystem |
| `agent_sessions` | ~10000s | Optional | No | tenantId, agentId, userId, status |
| `agent_messages` | ~100000s | No (via session) | No | sessionId, role |
| `agent_executions` | ~100000s | No (via agent) | No | agentId, sessionId, status, startedAt |

---

## Data Retention

- **Agents**: Retained indefinitely (or until explicitly deleted).
- **Agent versions**: Retained indefinitely. No automatic pruning.
- **Sessions**: Active sessions retained indefinitely. Archived sessions retained for 90 days (configurable via `module-config`).
- **Messages**: Retained as long as the parent session exists.
- **Executions**: Retained for 90 days by default (configurable). Aggregated statistics retained indefinitely.
