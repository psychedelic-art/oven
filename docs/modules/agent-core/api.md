# Module Agent Core -- API Reference

> All REST endpoints for agent management, invocation, sessions, and execution tracking.

---

## Endpoint Summary

| Method | Route | Handler File | Purpose |
|--------|-------|-------------|---------|
| GET | `/api/agents` | `agents.handler.ts` | List agent definitions |
| POST | `/api/agents` | `agents.handler.ts` | Create agent definition |
| GET | `/api/agents/[id]` | `agents-by-id.handler.ts` | Get agent by ID |
| PUT | `/api/agents/[id]` | `agents-by-id.handler.ts` | Update agent (auto-versions) |
| DELETE | `/api/agents/[id]` | `agents-by-id.handler.ts` | Delete agent |
| GET | `/api/agents/[id]/versions` | `agents-versions.handler.ts` | List version history |
| POST | `/api/agents/[id]/versions/[versionId]/restore` | `agents-versions-restore.handler.ts` | Restore a version |
| POST | `/api/agents/[slug]/invoke` | `agents-invoke.handler.ts` | Invoke agent (main endpoint) |
| GET | `/api/agents/tools` | `agents-tools.handler.ts` | List discovered tools |
| GET | `/api/agent-nodes` | `agent-nodes.handler.ts` | List node definitions |
| POST | `/api/agent-nodes` | `agent-nodes.handler.ts` | Create node definition |
| GET | `/api/agent-nodes/[id]` | `agent-nodes-by-id.handler.ts` | Get node by ID |
| PUT | `/api/agent-nodes/[id]` | `agent-nodes-by-id.handler.ts` | Update node definition |
| DELETE | `/api/agent-nodes/[id]` | `agent-nodes-by-id.handler.ts` | Delete node definition |
| GET | `/api/agent-sessions` | `agent-sessions.handler.ts` | List sessions |
| POST | `/api/agent-sessions` | `agent-sessions.handler.ts` | Create session |
| GET | `/api/agent-sessions/[id]` | `agent-sessions-by-id.handler.ts` | Get session with messages |
| DELETE | `/api/agent-sessions/[id]` | `agent-sessions-by-id.handler.ts` | Archive session |
| GET | `/api/agent-sessions/[id]/messages` | `agent-sessions-messages.handler.ts` | List messages |
| POST | `/api/agent-sessions/[id]/messages` | `agent-sessions-messages.handler.ts` | Send message (triggers execution) |
| GET | `/api/agent-executions` | `agent-executions.handler.ts` | List executions |
| GET | `/api/agent-executions/[id]` | `agent-executions-by-id.handler.ts` | Get execution detail |

---

## Agent Definitions

### `GET /api/agents`

List all agent definitions with pagination, sorting, and filtering.

**Query Parameters** (parsed by `parseListParams`):

| Param | Type | Description |
|-------|------|-------------|
| `sort` | `["field","ASC\|DESC"]` | Sort field and direction |
| `range` | `[start, end]` | Pagination range |
| `filter` | JSON | Filter object |

**Filter fields:**

| Field | Type | Description |
|-------|------|-------------|
| `tenantId` | number | Filter by tenant |
| `enabled` | boolean | Filter by enabled state |
| `q` | string | Full-text search on name and description |

**Response**: `200 OK`
```
Content-Range: agents 0-24/47
```
```json
[
  {
    "id": 1,
    "tenantId": 5,
    "name": "Dental FAQ Assistant",
    "slug": "dental-faq",
    "description": "Answers patient questions using the knowledge base",
    "llmConfig": {
      "provider": "openai",
      "model": "fast",
      "temperature": 0.3,
      "maxTokens": 1024
    },
    "systemPrompt": "You are a helpful dental assistant...",
    "exposedParams": ["temperature", "maxTokens"],
    "toolBindings": ["kb.searchEntries", "kb.getEntry"],
    "inputConfig": { "modalities": ["text", "image"] },
    "workflowAgentId": null,
    "metadata": {},
    "enabled": true,
    "version": 3,
    "createdAt": "2026-03-15T10:00:00Z",
    "updatedAt": "2026-03-28T14:30:00Z"
  }
]
```

**Permissions**: `agents.read`

---

### `POST /api/agents`

Create a new agent definition.

**Request body:**

```json
{
  "name": "Dental FAQ Assistant",
  "slug": "dental-faq",
  "description": "Answers patient questions using the knowledge base",
  "tenantId": 5,
  "llmConfig": {
    "provider": "openai",
    "model": "fast",
    "temperature": 0.3,
    "maxTokens": 1024,
    "topP": 1.0,
    "frequencyPenalty": 0,
    "presencePenalty": 0
  },
  "systemPrompt": "You are a helpful dental assistant for {{businessName}}...",
  "exposedParams": ["temperature", "maxTokens"],
  "toolBindings": ["kb.searchEntries", "kb.getEntry"],
  "inputConfig": { "modalities": ["text", "image"] },
  "enabled": true
}
```

**Required fields**: `name`, `llmConfig`, `systemPrompt`

**Auto-generated fields**: `slug` (from name, if not provided), `version` (1), `createdAt`, `updatedAt`

**Response**: `201 Created`
```json
{
  "id": 1,
  "name": "Dental FAQ Assistant",
  "slug": "dental-faq",
  "version": 1,
  "createdAt": "2026-03-15T10:00:00Z"
}
```

**Validation errors**: `400 Bad Request`
```json
{
  "error": "Validation failed",
  "details": {
    "slug": "Agent with slug 'dental-faq' already exists",
    "llmConfig.model": "Model alias 'nonexistent' not found"
  }
}
```

**Events emitted**: `agents.agent.created` `{ id, tenantId, name, slug }`

**Permissions**: `agents.create`

---

### `GET /api/agents/[id]`

Get a single agent definition by ID.

**Response**: `200 OK` with full agent object (same shape as list items).

**Error**: `404 Not Found` if agent does not exist or user lacks access.

**Permissions**: `agents.read`

---

### `PUT /api/agents/[id]`

Update an agent definition. Auto-creates a version snapshot if behavioral fields change.

**Request body**: Partial agent object (only include fields being changed).

```json
{
  "llmConfig": {
    "provider": "openai",
    "model": "smart",
    "temperature": 0.5,
    "maxTokens": 2048
  },
  "description": "Switched to smart model for better accuracy"
}
```

**Auto-versioning trigger fields**: `llmConfig`, `systemPrompt`, `toolBindings`, `exposedParams`, `inputConfig`

**Non-versioning fields**: `name`, `description`, `metadata`, `enabled`

**Response**: `200 OK` with updated agent object. `version` incremented if behavioral fields changed.

**Events emitted**: `agents.agent.updated` `{ id, tenantId, name, slug, version }`

**Permissions**: `agents.update`

---

### `DELETE /api/agents/[id]`

Delete an agent definition. Associated sessions are archived.

**Response**: `200 OK` `{ deleted: true }`

**Side effects**: All sessions linked to this agent are set to `status: 'archived'`.

**Events emitted**: `agents.agent.deleted` `{ id, slug }`

**Permissions**: `agents.delete`

---

## Version History

### `GET /api/agents/[id]/versions`

List version history for an agent, newest first.

**Response**: `200 OK`
```json
[
  {
    "id": 12,
    "agentId": 1,
    "version": 2,
    "definition": { "llmConfig": { "model": "fast", "temperature": 0.3 }, "..." : "..." },
    "description": "Initial configuration",
    "createdAt": "2026-03-15T10:00:00Z"
  },
  {
    "id": 11,
    "agentId": 1,
    "version": 1,
    "definition": { "..." : "..." },
    "description": null,
    "createdAt": "2026-03-10T08:00:00Z"
  }
]
```

**Permissions**: `agents.read`

---

### `POST /api/agents/[id]/versions/[versionId]/restore`

Restore the agent to a previous version. The current definition is snapshot as a new version before restoration.

**Response**: `200 OK` with the restored agent object. `version` incremented.

**Events emitted**: `agents.agent.updated` `{ id, name, slug, version }`

**Permissions**: `agents.update`

---

## Agent Invocation

### `POST /api/agents/[slug]/invoke`

The primary endpoint for interacting with an agent. Accepts messages and returns the agent's response.

**Request body:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "What are your office hours?" }
      ]
    }
  ],
  "params": {
    "temperature": 0.1
  },
  "sessionId": 42,
  "stream": true
}
```

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | `Message[]` | Yes | At least one message. Each message has `role` and `content` (parts array). |
| `params` | `object` | No | Override exposed parameters. Keys not in `agent.exposedParams` are ignored. |
| `sessionId` | `number` | No | Continue an existing session. Omit to create a new session. |
| `stream` | `boolean` | No | If true, response is SSE stream. Default: false. |

**Message format:**

```typescript
{
  role: 'user' | 'system';
  content: (
    | { type: 'text'; text: string }
    | { type: 'image'; imageUrl?: string; imageBase64?: string; mimeType: string }
    | { type: 'audio'; audioBase64: string; mimeType: string }
  )[];
}
```

**Invocation sequence:**

```
1. Load agent by slug             -> 404 if not found / disabled
2. Validate exposed param merges  -> 400 if invalid values
3. Merge params into llmConfig    -> effective config
4. Resolve tools (ToolWrapper)    -> filtered by toolBindings
5. Load/create session            -> 403 if session belongs to another user
6. Check quota                    -> 429 if exceeded
7. Select execution strategy      -> SingleTurn / MultiTurn / Workflow
8. Build and execute graph        -> LangGraph runtime
9. Record execution               -> agent_executions row
10. Return / stream response
```

**Response (non-streaming)**: `200 OK`

```json
{
  "message": {
    "role": "assistant",
    "content": [
      { "type": "text", "text": "Our office hours are Monday through Friday, 8 AM to 6 PM, and Saturday 9 AM to 1 PM." }
    ],
    "toolCalls": [
      {
        "id": "call_abc123",
        "name": "kb.searchEntries",
        "args": { "query": "office hours", "tenantSlug": "dental-clinic" }
      }
    ]
  },
  "sessionId": 42,
  "execution": {
    "id": 156,
    "tokenUsage": { "input": 1200, "output": 85, "total": 1285 },
    "latencyMs": 2340,
    "toolsUsed": ["kb.searchEntries"],
    "status": "completed"
  }
}
```

**Response (streaming)**: `200 OK` with `Content-Type: text/event-stream`

```
event: node_start
data: {"nodeId":"prompt"}

event: node_end
data: {"nodeId":"prompt","latencyMs":2}

event: node_start
data: {"nodeId":"llm"}

event: tool_call_start
data: {"toolName":"kb.searchEntries","args":{"query":"office hours"}}

event: tool_call_end
data: {"toolName":"kb.searchEntries","result":{"entries":[{"question":"What are your hours?","answer":"Mon-Fri 8-6, Sat 9-1"}]},"latencyMs":120}

event: token
data: {"content":"Our"}

event: token
data: {"content":" office"}

event: token
data: {"content":" hours"}

event: token
data: {"content":" are"}

...

event: node_end
data: {"nodeId":"llm","latencyMs":2180}

event: done
data: {"tokenUsage":{"input":1200,"output":85,"total":1285},"latencyMs":2340,"toolsUsed":["kb.searchEntries"],"sessionId":42}
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid messages format, invalid param override values |
| `403` | Agent disabled, session belongs to another user |
| `404` | Agent slug not found |
| `429` | Token quota exceeded |
| `500` | Execution error (details in response body and execution log) |

**Permissions**: `agents.invoke`

---

## Tool Catalog

### `GET /api/agents/tools`

Returns the complete tool catalog discovered from the Module Registry. Used by the dashboard to display available tools in the agent configuration UI.

**Response**: `200 OK`

```json
[
  {
    "name": "kb.searchEntries",
    "description": "Search the knowledge base for FAQ entries matching a query",
    "parameters": {
      "query": { "type": "string", "required": true, "description": "Search query" },
      "tenantSlug": { "type": "string", "required": true },
      "limit": { "type": "number", "description": "Max results" }
    },
    "endpoint": { "method": "POST", "path": "knowledge-base/[tenantSlug]/search" },
    "requiredPermissions": ["knowledge-base.read"],
    "source": "actionSchema",
    "moduleName": "knowledge-base"
  },
  {
    "name": "ai.generateText",
    "description": "Generate text using a language model",
    "parameters": {
      "prompt": { "type": "string", "required": true },
      "model": { "type": "string" },
      "temperature": { "type": "number" }
    },
    "endpoint": { "method": "POST", "path": "ai/generate-text" },
    "requiredPermissions": ["ai.invoke"],
    "source": "actionSchema",
    "moduleName": "ai"
  }
]
```

**Permissions**: `agents.read`

---

## Node Definitions

### `GET /api/agent-nodes`

List all node definitions in the library.

**Filter fields:**

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category (llm, tool, condition, transform, human-in-the-loop, memory) |
| `isSystem` | boolean | Filter system vs custom nodes |

**Response**: `200 OK` with Content-Range header.

```json
[
  {
    "id": 1,
    "name": "LLM",
    "slug": "llm",
    "category": "llm",
    "description": "Language model invocation",
    "inputs": [
      { "name": "messages", "type": "array", "description": "Conversation messages", "required": true }
    ],
    "outputs": [
      { "name": "response", "type": "object", "description": "LLM response with content and tool calls" }
    ],
    "config": {
      "model": { "type": "string", "default": "fast" },
      "temperature": { "type": "number", "default": 0.7 },
      "maxTokens": { "type": "number", "default": 4096 }
    },
    "isSystem": true,
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-01-01T00:00:00Z"
  }
]
```

**Permissions**: `agent-nodes.read`

---

### `POST /api/agent-nodes`

Create a custom node definition.

**Request body:**

```json
{
  "name": "Sentiment Analyzer",
  "slug": "sentiment-analyzer",
  "category": "transform",
  "description": "Analyzes sentiment of the last assistant message",
  "inputs": [
    { "name": "message", "type": "string", "required": true }
  ],
  "outputs": [
    { "name": "sentiment", "type": "string", "description": "positive, negative, or neutral" },
    { "name": "confidence", "type": "number" }
  ],
  "config": {}
}
```

**Validation**: `isSystem` cannot be set to `true` via API (only via seed).

**Permissions**: `agent-nodes.create`

---

### `DELETE /api/agent-nodes/[id]`

Delete a node definition. System nodes (`isSystem: true`) cannot be deleted.

**Error**: `403 Forbidden` if attempting to delete a system node.

**Permissions**: `agent-nodes.create` (same permission for create and delete of custom nodes)

---

## Sessions

### `GET /api/agent-sessions`

List agent conversation sessions.

**Filter fields:**

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | number | Filter by agent |
| `tenantId` | number | Filter by tenant |
| `userId` | number | Filter by user |
| `status` | string | `active` or `archived` |
| `isPlayground` | boolean | Filter playground sessions |

**Response**: `200 OK` with Content-Range header.

```json
[
  {
    "id": 42,
    "tenantId": 5,
    "agentId": 1,
    "userId": 12,
    "title": "What are your office hours?",
    "context": {},
    "status": "active",
    "isPlayground": false,
    "createdAt": "2026-03-28T14:30:00Z",
    "updatedAt": "2026-03-28T14:35:00Z"
  }
]
```

**Permissions**: `agent-sessions.read`

---

### `POST /api/agent-sessions`

Create a new conversation session.

**Request body:**

```json
{
  "agentId": 1,
  "title": "Office hours inquiry"
}
```

**Auto-set fields**: `userId` (from auth context), `tenantId` (from agent or auth context), `status` ("active"), `isPlayground` (false unless explicitly set).

**Permissions**: `agent-sessions.create`

---

### `GET /api/agent-sessions/[id]`

Get session detail including recent messages.

**Response**: `200 OK` with session object plus `messages` array (last 50 messages by default).

**Permissions**: `agent-sessions.read` (must be session owner or admin)

---

### `DELETE /api/agent-sessions/[id]`

Archive a session (set status to `archived`). Does not delete data.

**Response**: `200 OK` `{ archived: true }`

**Events emitted**: `agents.session.archived` `{ id, agentId, userId }`

**Permissions**: `agent-sessions.read` (session owner or admin)

---

### `GET /api/agent-sessions/[id]/messages`

List messages in a session with pagination.

**Response**: `200 OK` with Content-Range header.

```json
[
  {
    "id": 101,
    "sessionId": 42,
    "role": "user",
    "content": [{ "type": "text", "text": "What are your office hours?" }],
    "toolCalls": null,
    "toolResults": null,
    "metadata": {},
    "createdAt": "2026-03-28T14:30:00Z"
  },
  {
    "id": 102,
    "sessionId": 42,
    "role": "assistant",
    "content": [{ "type": "text", "text": "Our office hours are Monday through Friday..." }],
    "toolCalls": [{ "id": "call_abc", "name": "kb.searchEntries", "args": { "query": "office hours" } }],
    "toolResults": [{ "callId": "call_abc", "result": { "entries": [] } }],
    "metadata": { "model": "gpt-4o-mini", "tokens": { "input": 1200, "output": 85 } },
    "createdAt": "2026-03-28T14:30:03Z"
  }
]
```

**Permissions**: `agent-sessions.read`

---

### `POST /api/agent-sessions/[id]/messages`

Send a message within an existing session. This triggers agent execution and appends both the user message and the agent's response.

**Request body:**

```json
{
  "content": [{ "type": "text", "text": "And on weekends?" }],
  "params": { "temperature": 0.1 },
  "stream": true
}
```

This is a convenience endpoint equivalent to calling `POST /api/agents/[slug]/invoke` with the `sessionId`. The system resolves the agent from the session.

**Permissions**: `agent-sessions.create`

---

## Executions

### `GET /api/agent-executions`

List execution logs with pagination.

**Filter fields:**

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | number | Filter by agent |
| `sessionId` | number | Filter by session |
| `status` | string | `running`, `completed`, `failed` |
| `startedAt_gte` | string (ISO) | Executions started after this time |
| `startedAt_lte` | string (ISO) | Executions started before this time |

**Response**: `200 OK` with Content-Range header.

```json
[
  {
    "id": 156,
    "agentId": 1,
    "sessionId": 42,
    "messageId": 102,
    "status": "completed",
    "llmConfig": { "provider": "openai", "model": "gpt-4o-mini", "temperature": 0.1, "maxTokens": 1024 },
    "toolsUsed": ["kb.searchEntries"],
    "tokenUsage": { "input": 1200, "output": 85, "total": 1285 },
    "latencyMs": 2340,
    "error": null,
    "startedAt": "2026-03-28T14:30:00Z",
    "completedAt": "2026-03-28T14:30:02Z"
  }
]
```

**Permissions**: `agent-executions.read`

---

### `GET /api/agent-executions/[id]`

Get detailed execution record including effective LLM config, tool call detail, and timing breakdown.

**Response**: `200 OK` with full execution object.

**Permissions**: `agent-executions.read`

---

## MCP Tool Definitions

Agent Core registers the following tool definitions in its `chat.actionSchemas` for discovery by the Tool Wrapper and other agents:

```typescript
actionSchemas: [
  {
    name: 'agents.list',
    description: 'List all agent definitions',
    parameters: {
      tenantId: { type: 'number', description: 'Filter by tenant' },
      enabled: { type: 'boolean', description: 'Filter by enabled state' }
    },
    returns: { data: { type: 'array' }, total: { type: 'number' } },
    requiredPermissions: ['agents.read'],
    endpoint: { method: 'GET', path: 'agents' },
  },
  {
    name: 'agents.invoke',
    description: 'Invoke an agent by slug -- send messages and get a response',
    parameters: {
      slug: { type: 'string', required: true, description: 'Agent slug' },
      messages: { type: 'array', required: true, description: 'Message array' },
      params: { type: 'object', description: 'Override exposed parameters' },
      stream: { type: 'boolean', description: 'Enable SSE streaming' },
    },
    requiredPermissions: ['agents.invoke'],
    endpoint: { method: 'POST', path: 'agents/[slug]/invoke' },
  },
  {
    name: 'agents.listTools',
    description: 'List all available tools discovered from the registry',
    parameters: {},
    requiredPermissions: ['agents.read'],
    endpoint: { method: 'GET', path: 'agents/tools' },
  },
]
```
