# Database Schema — Workflow Agents

> 6 tables with column-level detail, indexes, and JSONB structure examples.

---

## Entity Relationship Diagram

```
agent_workflows (1) ---< agent_workflow_versions (N)
       |
       | (1)
       |
       +---< agent_workflow_executions (N) ---< agent_workflow_node_executions (N)
       |
       +---< mcp_server_definitions (1)

agent_memory (standalone, linked by agentId)
```

---

## Table 1: `agent_workflows`

Graph definitions for agent workflows. Extends the concept from module-workflows with agent-specific configuration.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | serial | NO | auto | Primary key |
| `tenant_id` | integer | YES | null | Nullable for platform-wide workflows. FK to tenants (plain integer). |
| `name` | varchar(255) | NO | -- | Human-readable display name |
| `slug` | varchar(128) | NO | -- | UNIQUE. URL-safe identifier |
| `description` | text | YES | null | Optional description |
| `definition` | jsonb | NO | -- | Extended WorkflowDefinition format (see JSONB example below) |
| `agent_config` | jsonb | YES | null | Default LLM configuration for all LLM nodes |
| `memory_config` | jsonb | YES | null | Memory settings for this workflow |
| `mcp_export` | boolean | NO | false | Auto-generate MCP server definition |
| `enabled` | boolean | NO | true | Toggle without deletion |
| `version` | integer | NO | 1 | Incremented on every definition update |
| `created_at` | timestamp | NO | now() | |
| `updated_at` | timestamp | NO | now() | |

**Indexes**:
- `aw_tenant_id_idx` on `tenant_id`
- `aw_slug_idx` on `slug` (unique)
- `aw_enabled_idx` on `enabled`

### JSONB: `definition`

```json
{
  "initial": "checkQuota",
  "states": {
    "checkQuota": {
      "invoke": {
        "src": "core.checkQuota",
        "input": {
          "serviceSlug": "llm-completion-tokens",
          "estimatedAmount": 1000
        }
      },
      "on": {
        "done": [
          {
            "target": "assemblePrompt",
            "guard": { "path": "$.checkQuota.allowed", "equals": true }
          },
          {
            "target": "quotaExceeded"
          }
        ]
      }
    },
    "assemblePrompt": {
      "invoke": {
        "src": "agent.prompt",
        "input": {
          "template": "You are a dental clinic assistant for {{$.tenantConfig.BUSINESS_NAME}}."
        }
      },
      "on": { "done": "readMemory" }
    },
    "readMemory": {
      "invoke": {
        "src": "agent.memory.read",
        "input": { "topK": 5 }
      },
      "on": { "done": "toolLoop" }
    },
    "toolLoop": {
      "invoke": {
        "src": "agent.toolLoop",
        "input": {
          "tools": ["kb.searchEntries", "tenants.getSchedule"],
          "maxIterations": 5
        }
      },
      "on": { "done": "trackUsage" }
    },
    "trackUsage": {
      "invoke": {
        "src": "core.trackUsage",
        "input": {
          "serviceSlug": "llm-completion-tokens",
          "amount": "$.toolLoop.tokenUsage.total"
        }
      },
      "on": { "done": "writeMemory" }
    },
    "writeMemory": {
      "invoke": { "src": "agent.memory.write" },
      "on": { "done": "end" }
    },
    "quotaExceeded": {
      "invoke": {
        "src": "agent.prompt",
        "input": {
          "template": "Your plan's AI quota has been exhausted. Please upgrade."
        }
      },
      "on": { "done": "end" }
    }
  }
}
```

### JSONB: `agent_config`

```json
{
  "defaultModel": "gpt-4o",
  "temperature": 0.7,
  "maxTokens": 2048,
  "topP": 1.0,
  "frequencyPenalty": 0,
  "presencePenalty": 0,
  "guardrails": {
    "input": [
      {
        "type": "keyword",
        "pattern": "emergency|urgent|bleeding",
        "action": "escalate",
        "message": "This may require immediate medical attention."
      }
    ],
    "output": [
      {
        "type": "classifier",
        "pattern": "medical_diagnosis",
        "action": "block",
        "message": "I cannot provide medical diagnoses."
      }
    ]
  }
}
```

### JSONB: `memory_config`

```json
{
  "enabled": true,
  "scope": "agent+user",
  "retrievalStrategy": "semantic",
  "topK": 5,
  "embeddingModel": "text-embedding-3-small"
}
```

---

## Table 2: `agent_workflow_versions`

Snapshots of previous workflow definitions for version history.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | serial | NO | auto | Primary key |
| `agent_workflow_id` | integer | NO | -- | FK to agent_workflows (plain integer) |
| `version` | integer | NO | -- | The version number being snapshotted |
| `definition` | jsonb | NO | -- | Full definition at this version |
| `description` | text | YES | null | Optional changelog note |
| `created_at` | timestamp | NO | now() | |

**Indexes**:
- `awv_workflow_id_idx` on `agent_workflow_id`
- UNIQUE constraint on `(agent_workflow_id, version)`

---

## Table 3: `agent_workflow_executions`

Execution records with checkpointing, cost tracking, and status management.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | serial | NO | auto | Primary key |
| `agent_workflow_id` | integer | NO | -- | FK to agent_workflows |
| `tenant_id` | integer | YES | null | Inherited from workflow or caller context |
| `agent_id` | integer | YES | null | FK to agents (which agent triggered this) |
| `session_id` | integer | YES | null | FK to agent_sessions (chat context) |
| `status` | varchar(32) | NO | 'running' | One of: running, paused, completed, failed |
| `current_state` | varchar(128) | YES | null | Current graph position (state/node name) |
| `context` | jsonb | YES | null | Accumulated context snapshot |
| `checkpoint` | jsonb | YES | null | Full checkpoint for pause/resume |
| `trigger_event` | varchar(255) | YES | null | Event that triggered this execution |
| `token_usage` | jsonb | YES | null | Aggregate: { input, output, total } |
| `total_cost_cents` | integer | YES | 0 | Sum of all node costs |
| `started_at` | timestamp | YES | null | |
| `completed_at` | timestamp | YES | null | |
| `error` | text | YES | null | Error message if failed |
| `created_at` | timestamp | NO | now() | |
| `updated_at` | timestamp | NO | now() | |

**Indexes**:
- `awe_tenant_id_idx` on `tenant_id`
- `awe_workflow_id_idx` on `agent_workflow_id`
- `awe_agent_id_idx` on `agent_id`
- `awe_session_id_idx` on `session_id`
- `awe_status_idx` on `status`

### JSONB: `checkpoint`

```json
{
  "currentState": "humanReview",
  "context": {
    "assemblePrompt": { "systemPrompt": "..." },
    "toolLoop": {
      "response": "I recommend scheduling a cleaning appointment.",
      "toolCalls": [
        { "tool": "kb.searchEntries", "result": { "entries": ["..."] } }
      ]
    }
  },
  "messages": [
    { "role": "system", "content": "You are a dental clinic assistant." },
    { "role": "user", "content": "I need a cleaning." },
    { "role": "assistant", "content": "I recommend scheduling a cleaning appointment." }
  ],
  "pendingToolCalls": [],
  "iteration": 3,
  "proposedAction": {
    "type": "send_response",
    "content": "I recommend scheduling a cleaning appointment. Would you like me to check available times?"
  }
}
```

### JSONB: `token_usage`

```json
{
  "input": 2500,
  "output": 860,
  "total": 3360
}
```

---

## Table 4: `agent_workflow_node_executions`

Per-node execution records providing a complete audit trail.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | serial | NO | auto | Primary key |
| `execution_id` | integer | NO | -- | FK to agent_workflow_executions |
| `node_id` | varchar(128) | NO | -- | State name in the graph |
| `node_type` | varchar(64) | NO | -- | Node type: agent.llm, agent.toolExecutor, etc. |
| `status` | varchar(32) | NO | 'running' | running, completed, failed, paused |
| `input` | jsonb | YES | null | Resolved input parameters |
| `output` | jsonb | YES | null | Node output |
| `token_usage` | jsonb | YES | null | For LLM nodes: { input, output, total } |
| `cost_cents` | integer | YES | null | Upstream cost for this node |
| `tool_calls` | jsonb | YES | null | For tool executor nodes: array of invocations |
| `error` | text | YES | null | |
| `duration_ms` | integer | YES | null | Execution time |
| `started_at` | timestamp | YES | null | |
| `completed_at` | timestamp | YES | null | |
| `created_at` | timestamp | NO | now() | |

**Indexes**:
- `awne_execution_id_idx` on `execution_id`
- `awne_node_type_idx` on `node_type`
- `awne_status_idx` on `status`

### JSONB: `tool_calls`

```json
[
  {
    "id": "call_abc123",
    "tool": "kb.searchEntries",
    "args": { "query": "cleaning appointment", "tenantSlug": "acme-dental" },
    "result": {
      "entries": [
        {
          "id": 42,
          "question": "How do I schedule a cleaning?",
          "answer": "Call us at (555) 123-4567 or use the online scheduler."
        }
      ]
    },
    "durationMs": 340,
    "error": null
  },
  {
    "id": "call_def456",
    "tool": "tenants.getSchedule",
    "args": { "tenantId": 5 },
    "result": {
      "mon": { "open": "09:00", "close": "17:00" },
      "tue": { "open": "09:00", "close": "17:00" }
    },
    "durationMs": 120,
    "error": null
  }
]
```

---

## Table 5: `agent_memory`

Long-term memory store for agents with optional vector embeddings for semantic retrieval.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | serial | NO | auto | Primary key |
| `agent_id` | integer | NO | -- | FK to agents. Scopes memory to a specific agent. |
| `user_id` | integer | YES | null | Optional FK to users. Enables per-user memory. |
| `key` | varchar(255) | NO | -- | Topic/category (e.g., "preferences", "medical_history") |
| `content` | text | NO | -- | The stored information |
| `embedding` | vector(1536) | YES | null | pgvector column for semantic retrieval. Populated by agent.memory.write node. |
| `metadata` | jsonb | YES | null | Source context and scores |
| `created_at` | timestamp | NO | now() | |
| `updated_at` | timestamp | NO | now() | |

**Indexes**:
- `amem_agent_id_idx` on `agent_id`
- `amem_user_id_idx` on `user_id`
- `amem_key_idx` on `key`
- HNSW or IVFFlat index on `embedding` for vector similarity search

**Note**: The `embedding` column uses the `pgvector` extension (`vector(1536)` for OpenAI text-embedding-3-small). The dimension may vary based on the configured embedding model. The vector index type (HNSW vs IVFFlat) is determined at deployment time based on dataset size.

### JSONB: `metadata`

```json
{
  "sourceSessionId": 45,
  "sourceExecutionId": 100,
  "relevanceScore": 0.92,
  "extractedAt": "2026-03-18T10:00:00Z",
  "model": "gpt-4o"
}
```

---

## Table 6: `mcp_server_definitions`

Auto-generated MCP server configurations derived from workflow definitions.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | serial | NO | auto | Primary key |
| `agent_workflow_id` | integer | NO | -- | FK to agent_workflows. One MCP definition per workflow. |
| `name` | varchar(255) | NO | -- | Display name for the MCP server |
| `slug` | varchar(128) | NO | -- | UNIQUE. URL-safe identifier |
| `tool_definitions` | jsonb | NO | -- | Array of MCP ToolDefinition objects |
| `status` | varchar(32) | NO | 'active' | active or disabled |
| `last_generated_at` | timestamp | YES | null | When definitions were last rebuilt |
| `created_at` | timestamp | NO | now() | |
| `updated_at` | timestamp | NO | now() | |

**Indexes**:
- `mcp_workflow_id_idx` on `agent_workflow_id`
- `mcp_slug_idx` on `slug` (unique)
- `mcp_status_idx` on `status`

### JSONB: `tool_definitions`

```json
[
  {
    "name": "dental-faq-agent",
    "description": "Invoke the Dental FAQ Agent workflow to answer dental questions",
    "inputSchema": {
      "type": "object",
      "properties": {
        "messages": {
          "type": "array",
          "description": "Conversation messages to process",
          "items": {
            "type": "object",
            "properties": {
              "role": { "type": "string", "enum": ["user", "assistant", "system"] },
              "content": { "type": "string" }
            },
            "required": ["role", "content"]
          }
        },
        "tenantSlug": {
          "type": "string",
          "description": "Tenant identifier for context resolution"
        }
      },
      "required": ["messages"]
    }
  },
  {
    "name": "kb.searchEntries",
    "description": "Search the knowledge base for FAQ entries matching a query",
    "inputSchema": {
      "type": "object",
      "properties": {
        "query": { "type": "string", "description": "Search query text" },
        "tenantSlug": { "type": "string" },
        "topK": { "type": "number", "default": 5 }
      },
      "required": ["query"]
    }
  }
]
```

---

## Drizzle Schema Definition

```typescript
import { pgTable, serial, integer, varchar, text, boolean, jsonb, timestamp, index, unique } from 'drizzle-orm/pg-core';

export const agentWorkflows = pgTable('agent_workflows', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenant_id'),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  description: text('description'),
  definition: jsonb('definition').notNull(),
  agentConfig: jsonb('agent_config'),
  memoryConfig: jsonb('memory_config'),
  mcpExport: boolean('mcp_export').notNull().default(false),
  enabled: boolean('enabled').notNull().default(true),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('aw_tenant_id_idx').on(table.tenantId),
  index('aw_enabled_idx').on(table.enabled),
]);

export const agentWorkflowVersions = pgTable('agent_workflow_versions', {
  id: serial('id').primaryKey(),
  agentWorkflowId: integer('agent_workflow_id').notNull(),
  version: integer('version').notNull(),
  definition: jsonb('definition').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('awv_workflow_id_idx').on(table.agentWorkflowId),
  unique('awv_unique').on(table.agentWorkflowId, table.version),
]);

export const agentWorkflowExecutions = pgTable('agent_workflow_executions', {
  id: serial('id').primaryKey(),
  agentWorkflowId: integer('agent_workflow_id').notNull(),
  tenantId: integer('tenant_id'),
  agentId: integer('agent_id'),
  sessionId: integer('session_id'),
  status: varchar('status', { length: 32 }).notNull().default('running'),
  currentState: varchar('current_state', { length: 128 }),
  context: jsonb('context'),
  checkpoint: jsonb('checkpoint'),
  triggerEvent: varchar('trigger_event', { length: 255 }),
  tokenUsage: jsonb('token_usage'),
  totalCostCents: integer('total_cost_cents').default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('awe_tenant_id_idx').on(table.tenantId),
  index('awe_workflow_id_idx').on(table.agentWorkflowId),
  index('awe_agent_id_idx').on(table.agentId),
  index('awe_session_id_idx').on(table.sessionId),
  index('awe_status_idx').on(table.status),
]);

export const agentWorkflowNodeExecutions = pgTable('agent_workflow_node_executions', {
  id: serial('id').primaryKey(),
  executionId: integer('execution_id').notNull(),
  nodeId: varchar('node_id', { length: 128 }).notNull(),
  nodeType: varchar('node_type', { length: 64 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('running'),
  input: jsonb('input'),
  output: jsonb('output'),
  tokenUsage: jsonb('token_usage'),
  costCents: integer('cost_cents'),
  toolCalls: jsonb('tool_calls'),
  error: text('error'),
  durationMs: integer('duration_ms'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('awne_execution_id_idx').on(table.executionId),
  index('awne_node_type_idx').on(table.nodeType),
  index('awne_status_idx').on(table.status),
]);

export const agentMemory = pgTable('agent_memory', {
  id: serial('id').primaryKey(),
  agentId: integer('agent_id').notNull(),
  userId: integer('user_id'),
  key: varchar('key', { length: 255 }).notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),  // requires pgvector extension — install before migration
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('amem_agent_id_idx').on(table.agentId),
  index('amem_user_id_idx').on(table.userId),
  index('amem_key_idx').on(table.key),
]);

export const mcpServerDefinitions = pgTable('mcp_server_definitions', {
  id: serial('id').primaryKey(),
  agentWorkflowId: integer('agent_workflow_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  toolDefinitions: jsonb('tool_definitions').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  lastGeneratedAt: timestamp('last_generated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('mcp_workflow_id_idx').on(table.agentWorkflowId),
  index('mcp_status_idx').on(table.status),
]);
```

---

## Module Rules Compliance

| Rule | Status | Notes |
|------|--------|-------|
| tenantId column | Compliant | `agent_workflows` and `agent_workflow_executions` have nullable tenantId |
| tenantId indexed | Compliant | Both tables have tenantId indexes |
| Foreign keys as plain integers | Compliant | All FKs use `integer()`, no Drizzle `references()` |
| Slug columns unique | Compliant | `agent_workflows.slug` and `mcp_server_definitions.slug` are unique |
| Standard columns (id, createdAt, updatedAt) | Compliant | All tables have these columns |
| Version history table | Compliant | `agent_workflow_versions` snapshots definitions |
| Indexes on filter columns | Compliant | status, enabled, nodeType all indexed |
