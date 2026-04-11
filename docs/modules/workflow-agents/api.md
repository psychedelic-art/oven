# API Reference — Workflow Agents, MCP Server & Python Sidecar

> All endpoints across all three packages with request/response schemas.

---

## Package 1: module-workflow-agents (18 endpoints)

All endpoints use standard OVEN API conventions:
- List endpoints return `Content-Range` header for React Admin pagination
- Sorting: `sort=["field","ASC"]`
- Pagination: `range=[0,24]`
- Error responses: `{ error: string, message: string }`

### Agent Workflows

#### `GET /api/agent-workflows`

List agent workflow definitions.

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| sort | string | JSON array: `["name","ASC"]` |
| range | string | JSON array: `[0,24]` |
| filter | string | JSON object: `{"tenantId":5,"enabled":true}` |

**Response** (200):
```json
[
  {
    "id": 1,
    "tenantId": 5,
    "name": "Dental FAQ Agent",
    "slug": "dental-faq-agent",
    "description": "Answers dental clinic FAQs with KB search",
    "definition": { "...graph definition..." },
    "agentConfig": {
      "defaultModel": "gpt-4o",
      "temperature": 0.7,
      "maxTokens": 2048,
      "guardrails": { "input": [], "output": [] }
    },
    "memoryConfig": {
      "enabled": true,
      "scope": "agent+user",
      "retrievalStrategy": "semantic",
      "topK": 5
    },
    "mcpExport": true,
    "enabled": true,
    "version": 3,
    "createdAt": "2026-03-15T10:00:00Z",
    "updatedAt": "2026-03-20T14:30:00Z"
  }
]
```

**Headers**: `Content-Range: agent-workflows 0-24/42`

---

#### `POST /api/agent-workflows`

Create a new agent workflow.

**Request Body**:
```json
{
  "tenantId": 5,
  "name": "Dental FAQ Agent",
  "slug": "dental-faq-agent",
  "description": "Answers dental clinic FAQs with KB search",
  "definition": {
    "initial": "assemblePrompt",
    "states": {
      "assemblePrompt": {
        "invoke": { "src": "agent.prompt" },
        "config": {
          "template": "You are a dental clinic assistant for {{$.tenantConfig.BUSINESS_NAME}}."
        },
        "on": { "done": "readMemory" }
      },
      "readMemory": {
        "invoke": { "src": "agent.memory.read" },
        "config": { "topK": 5 },
        "on": { "done": "toolLoop" }
      },
      "toolLoop": {
        "invoke": { "src": "agent.toolLoop" },
        "config": {
          "tools": ["kb.searchEntries"],
          "maxIterations": 5
        },
        "on": { "done": "writeMemory" }
      },
      "writeMemory": {
        "invoke": { "src": "agent.memory.write" },
        "on": { "done": "end" }
      }
    }
  },
  "agentConfig": {
    "defaultModel": "gpt-4o",
    "temperature": 0.7,
    "maxTokens": 2048
  },
  "memoryConfig": {
    "enabled": true,
    "scope": "agent+user",
    "retrievalStrategy": "semantic"
  },
  "mcpExport": false,
  "enabled": true
}
```

**Response** (201): Created workflow object with generated `id`, `version: 1`, timestamps.

---

#### `GET /api/agent-workflows/[id]`

Get a single agent workflow by ID.

**Response** (200): Full workflow object (same shape as list items).

**Response** (404): `{ "error": "not_found", "message": "Agent workflow not found" }`

---

#### `PUT /api/agent-workflows/[id]`

Update an agent workflow. Auto-creates a version snapshot if the definition changes.

**Request Body**: Same shape as POST (partial updates supported).

**Response** (200): Updated workflow object with incremented `version` (if definition changed).

**Side Effects**:
- If definition changed: new record in `agent_workflow_versions`
- If mcpExport changed to true: triggers MCP generation
- If definition changed and mcpExport=true and MCP_AUTO_REGENERATE=true: triggers MCP regeneration

---

#### `DELETE /api/agent-workflows/[id]`

Delete an agent workflow and all related records.

**Response** (204): No content.

**Cascades**: Removes related versions, executions, node executions, memory entries, and MCP server definitions.

---

### Agent Workflow Versions

#### `GET /api/agent-workflows/[id]/versions`

List version history for a workflow.

**Response** (200):
```json
[
  {
    "id": 3,
    "agentWorkflowId": 1,
    "version": 2,
    "definition": { "...previous definition..." },
    "description": null,
    "createdAt": "2026-03-18T10:00:00Z"
  },
  {
    "id": 2,
    "agentWorkflowId": 1,
    "version": 1,
    "definition": { "...original definition..." },
    "description": null,
    "createdAt": "2026-03-15T10:00:00Z"
  }
]
```

---

#### `POST /api/agent-workflows/[id]/versions/[versionId]/restore`

Restore a previous version. Creates a new version record (non-destructive).

**Response** (200): Updated workflow object with the restored definition and incremented version.

---

### Agent Workflow Executions

#### `POST /api/agent-workflows/[id]/execute`

Manually trigger a workflow execution.

**Request Body**:
```json
{
  "input": {
    "messages": [
      { "role": "user", "content": "What are your office hours?" }
    ]
  },
  "agentId": 12,
  "sessionId": 45
}
```

**Response** (202):
```json
{
  "id": 100,
  "agentWorkflowId": 1,
  "tenantId": 5,
  "agentId": 12,
  "sessionId": 45,
  "status": "running",
  "currentState": "assemblePrompt",
  "startedAt": "2026-03-20T14:30:00Z"
}
```

---

#### `GET /api/agent-workflow-executions`

List executions with filters and pagination.

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| filter | string | `{"agentWorkflowId":1,"status":"completed","tenantId":5}` |
| sort | string | `["startedAt","DESC"]` |
| range | string | `[0,24]` |

**Response** (200):
```json
[
  {
    "id": 100,
    "agentWorkflowId": 1,
    "tenantId": 5,
    "agentId": 12,
    "sessionId": 45,
    "status": "completed",
    "currentState": "end",
    "tokenUsage": { "input": 1250, "output": 430, "total": 1680 },
    "totalCostCents": 12,
    "startedAt": "2026-03-20T14:30:00Z",
    "completedAt": "2026-03-20T14:30:08Z",
    "error": null
  }
]
```

---

#### `GET /api/agent-workflow-executions/[id]`

Get execution detail including context snapshot.

**Response** (200):
```json
{
  "id": 100,
  "agentWorkflowId": 1,
  "tenantId": 5,
  "agentId": 12,
  "sessionId": 45,
  "status": "completed",
  "currentState": "end",
  "context": {
    "assemblePrompt": { "systemPrompt": "You are a dental clinic assistant..." },
    "readMemory": { "memories": ["Patient prefers morning appointments"] },
    "toolLoop": { "response": "Our office hours are Monday-Friday 9AM-5PM." }
  },
  "checkpoint": null,
  "triggerEvent": null,
  "tokenUsage": { "input": 1250, "output": 430, "total": 1680 },
  "totalCostCents": 12,
  "startedAt": "2026-03-20T14:30:00Z",
  "completedAt": "2026-03-20T14:30:08Z",
  "error": null
}
```

---

#### `POST /api/agent-workflow-executions/[id]/resume`

Resume a paused execution (human-in-the-loop).

**Request Body**:
```json
{
  "action": "approve",
  "data": {},
  "reason": "Response looks appropriate, proceed."
}
```

**Action values**:
- `"approve"` -- Continue from checkpoint without changes
- `"edit"` -- Merge `data` into context, then continue
- `"reject"` -- Transition to error/fallback state

**Response** (200):
```json
{
  "id": 100,
  "status": "running",
  "currentState": "nextNode",
  "resumedAt": "2026-03-20T15:00:00Z"
}
```

**Error Responses**:
- 400: Execution is not in 'paused' status
- 403: User lacks `agent-workflow-executions.resume` permission

---

#### `POST /api/agent-workflow-executions/[id]/cancel`

Cancel a running execution.

**Response** (200):
```json
{
  "id": 100,
  "status": "failed",
  "error": "Execution cancelled by user",
  "completedAt": "2026-03-20T15:05:00Z"
}
```

---

#### `GET /api/agent-workflow-executions/[id]/nodes`

List node executions for a specific execution.

**Response** (200):
```json
[
  {
    "id": 501,
    "executionId": 100,
    "nodeId": "assemblePrompt",
    "nodeType": "agent.prompt",
    "status": "completed",
    "input": { "template": "You are a dental clinic assistant..." },
    "output": { "systemPrompt": "You are a dental clinic assistant for Acme Dental." },
    "tokenUsage": null,
    "costCents": null,
    "toolCalls": null,
    "error": null,
    "durationMs": 15,
    "startedAt": "2026-03-20T14:30:00.100Z",
    "completedAt": "2026-03-20T14:30:00.115Z"
  },
  {
    "id": 502,
    "executionId": 100,
    "nodeId": "toolLoop",
    "nodeType": "agent.toolLoop",
    "status": "completed",
    "input": { "messages": ["..."], "tools": ["kb.searchEntries"] },
    "output": { "response": "Our office hours are Monday-Friday 9AM-5PM." },
    "tokenUsage": { "input": 1250, "output": 430, "total": 1680 },
    "costCents": 12,
    "toolCalls": [
      {
        "tool": "kb.searchEntries",
        "args": { "query": "office hours" },
        "result": { "entries": [{ "question": "What are your hours?", "answer": "..." }] },
        "durationMs": 340
      }
    ],
    "error": null,
    "durationMs": 3200,
    "startedAt": "2026-03-20T14:30:01.000Z",
    "completedAt": "2026-03-20T14:30:04.200Z"
  }
]
```

---

### Agent Memory

#### `GET /api/agent-memory`

List memory entries.

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| filter | string | `{"agentId":12,"userId":7}` |
| sort | string | `["createdAt","DESC"]` |
| range | string | `[0,24]` |

**Response** (200):
```json
[
  {
    "id": 1,
    "agentId": 12,
    "userId": 7,
    "key": "preferences",
    "content": "Patient prefers morning appointments, allergic to penicillin",
    "metadata": { "sourceSessionId": 45, "relevanceScore": 0.92 },
    "createdAt": "2026-03-18T10:00:00Z",
    "updatedAt": "2026-03-18T10:00:00Z"
  }
]
```

---

#### `POST /api/agent-memory`

Create a memory entry.

**Request Body**:
```json
{
  "agentId": 12,
  "userId": 7,
  "key": "preferences",
  "content": "Patient prefers morning appointments, allergic to penicillin",
  "metadata": { "sourceSessionId": 45 }
}
```

**Response** (201): Created memory entry (embedding generated asynchronously).

---

#### `DELETE /api/agent-memory/[id]`

Delete a memory entry.

**Response** (204): No content.

---

### MCP Servers

#### `GET /api/mcp-servers`

List auto-generated MCP server definitions.

**Response** (200):
```json
[
  {
    "id": 1,
    "agentWorkflowId": 1,
    "name": "Dental FAQ Agent MCP",
    "slug": "dental-faq-agent-mcp",
    "toolDefinitions": [
      {
        "name": "dental-faq-agent",
        "description": "Invoke the Dental FAQ Agent workflow",
        "inputSchema": {
          "type": "object",
          "properties": {
            "messages": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "role": { "type": "string" },
                  "content": { "type": "string" }
                }
              }
            }
          },
          "required": ["messages"]
        }
      },
      {
        "name": "kb.searchEntries",
        "description": "Search the knowledge base for FAQ entries",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" },
            "tenantSlug": { "type": "string" }
          },
          "required": ["query"]
        }
      }
    ],
    "status": "active",
    "lastGeneratedAt": "2026-03-20T14:30:00Z",
    "createdAt": "2026-03-15T10:00:00Z",
    "updatedAt": "2026-03-20T14:30:00Z"
  }
]
```

---

#### `GET /api/mcp-servers/[id]`

Get a specific MCP server definition.

**Response** (200): Full MCP server object.

---

#### `POST /api/mcp-servers/[id]/regenerate`

Manually regenerate MCP definitions from the current workflow state.

**Response** (200):
```json
{
  "id": 1,
  "lastGeneratedAt": "2026-03-20T16:00:00Z",
  "toolCount": 3,
  "status": "active"
}
```

---

## Package 2: mcp-server (MCP Protocol Endpoints)

These follow the Model Context Protocol specification. Communication happens via stdio (local) or HTTP (Vercel).

### `tools/list`

List all available MCP tools from all registered modules.

**Response**:
```json
{
  "tools": [
    {
      "name": "kb.searchEntries",
      "description": "Search the knowledge base for FAQ entries matching a query",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search query" },
          "tenantSlug": { "type": "string", "description": "Tenant identifier" }
        },
        "required": ["query"]
      }
    },
    {
      "name": "agentWorkflows.execute",
      "description": "Manually trigger an agent workflow execution",
      "inputSchema": {
        "type": "object",
        "properties": {
          "workflowId": { "type": "number" },
          "input": { "type": "object" }
        },
        "required": ["workflowId"]
      }
    }
  ]
}
```

### `tools/call`

Execute an MCP tool. Routed to the corresponding module API endpoint.

**Request**:
```json
{
  "name": "kb.searchEntries",
  "arguments": {
    "query": "office hours",
    "tenantSlug": "acme-dental"
  }
}
```

**Response**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"entries\":[{\"question\":\"What are your hours?\",\"answer\":\"Monday-Friday 9AM-5PM\"}]}"
    }
  ]
}
```

**Error Response** (permission denied):
```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Permission denied: requires kb-entries.read"
    }
  ]
}
```

### `resources/list`

List module metadata as MCP resources.

**Response**:
```json
{
  "resources": [
    {
      "uri": "oven://modules/knowledge-base",
      "name": "Knowledge Base",
      "description": "Structured FAQ with categories, entries, and semantic search",
      "mimeType": "application/json"
    },
    {
      "uri": "oven://modules/workflow-agents",
      "name": "Workflow Agents",
      "description": "Graph-based AI agent orchestration",
      "mimeType": "application/json"
    }
  ]
}
```

### `resources/read`

Read module metadata.

**Request**: `{ "uri": "oven://modules/knowledge-base" }`

**Response**:
```json
{
  "contents": [
    {
      "uri": "oven://modules/knowledge-base",
      "mimeType": "application/json",
      "text": "{\"name\":\"knowledge-base\",\"description\":\"...\",\"capabilities\":[\"search FAQ entries\",\"embed entries\"],\"actionSchemas\":[...]}"
    }
  ]
}
```

### `prompts/list`

List available agent system prompts.

**Response**:
```json
{
  "prompts": [
    {
      "name": "dental-faq-agent",
      "description": "System prompt for the Dental FAQ Agent",
      "arguments": [
        { "name": "businessName", "description": "Clinic name", "required": true },
        { "name": "tone", "description": "Response tone", "required": false }
      ]
    }
  ]
}
```

### `prompts/get`

Get a parameterized prompt with arguments resolved.

**Request**: `{ "name": "dental-faq-agent", "arguments": { "businessName": "Acme Dental", "tone": "friendly" } }`

**Response**:
```json
{
  "description": "System prompt for the Dental FAQ Agent",
  "messages": [
    {
      "role": "system",
      "content": {
        "type": "text",
        "text": "You are a friendly dental clinic assistant for Acme Dental. Answer only dental-related questions."
      }
    }
  ]
}
```

---

## Package 3: agent-runtime-py (FastAPI Endpoints)

Base URL: `{PYTHON_RUNTIME_URL}` (configured via module-config).

### `POST /execute`

Execute a workflow definition (blocking).

**Request Body**:
```json
{
  "workflowId": 1,
  "input": {
    "messages": [
      { "role": "user", "content": "What are your office hours?" }
    ]
  },
  "config": {
    "thread_id": "exec-100",
    "oven_api_url": "https://app.example.com/api",
    "oven_api_key": "sk-..."
  }
}
```

**Response** (200):
```json
{
  "status": "completed",
  "result": {
    "messages": [
      { "role": "user", "content": "What are your office hours?" },
      { "role": "assistant", "content": "Our office hours are Monday-Friday 9AM-5PM." }
    ],
    "response": "Our office hours are Monday-Friday 9AM-5PM."
  },
  "tokenUsage": { "input": 1250, "output": 430, "total": 1680 },
  "costCents": 12,
  "durationMs": 3200
}
```

---

### `POST /stream`

Execute a workflow with SSE streaming.

**Request Body**: Same as `/execute`.

**Response** (200, `text/event-stream`):
```
data: {"type": "node_start", "nodeId": "assemblePrompt", "nodeType": "agent.prompt"}

data: {"type": "node_complete", "nodeId": "assemblePrompt", "durationMs": 15}

data: {"type": "node_start", "nodeId": "toolLoop", "nodeType": "agent.toolLoop"}

data: {"type": "token", "content": "Our"}

data: {"type": "token", "content": " office"}

data: {"type": "token", "content": " hours"}

data: {"type": "token", "content": " are"}

data: {"type": "token", "content": " Monday-Friday 9AM-5PM."}

data: {"type": "node_complete", "nodeId": "toolLoop", "durationMs": 3200, "tokenUsage": {"input": 1250, "output": 430, "total": 1680}}

data: {"type": "execution_complete", "status": "completed", "totalCostCents": 12}
```

---

### `GET /health`

Health check endpoint.

**Response** (200):
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "python_version": "3.11.8",
  "registered_nodes": 13,
  "langsmith_enabled": true,
  "checkpointer_connected": true
}
```

---

### `GET /nodes`

List all registered Python node types.

**Response** (200):
```json
{
  "nodes": [
    { "type": "agent.llm", "category": "llm", "description": "Invoke a language model via OVEN API" },
    { "type": "agent.toolExecutor", "category": "tool", "description": "Execute tool calls from LLM" },
    { "type": "agent.toolLoop", "category": "loop", "description": "ReAct cycle: LLM -> tools -> LLM" },
    { "type": "agent.memory.read", "category": "memory", "description": "Semantic retrieval from agent memory" },
    { "type": "agent.memory.write", "category": "memory", "description": "Persist key information to memory" },
    { "type": "agent.rag", "category": "data", "description": "Retrieval-augmented generation" },
    { "type": "agent.humanReview", "category": "human", "description": "Pause for human approval" },
    { "type": "agent.subagent", "category": "utility", "description": "Invoke another agent as subgraph" },
    { "type": "agent.prompt", "category": "transform", "description": "Dynamic prompt assembly" },
    { "type": "agent.imageGen", "category": "utility", "description": "Image generation via OVEN API" },
    { "type": "agent.embed", "category": "utility", "description": "Text embedding via OVEN API" },
    { "type": "core.checkQuota", "category": "data", "description": "Pre-flight quota check" },
    { "type": "core.trackUsage", "category": "data", "description": "Record metered usage" }
  ]
}
```

---

## Permissions

| Permission Slug | Required For |
|----------------|-------------|
| `agent-workflows.read` | GET agent-workflows, GET versions |
| `agent-workflows.create` | POST agent-workflows |
| `agent-workflows.update` | PUT agent-workflows, POST restore |
| `agent-workflows.delete` | DELETE agent-workflows |
| `agent-workflows.execute` | POST execute |
| `agent-workflow-executions.read` | GET executions, GET nodes |
| `agent-workflow-executions.resume` | POST resume |
| `agent-workflow-executions.cancel` | POST cancel |
| `agent-memory.read` | GET agent-memory |
| `agent-memory.create` | POST agent-memory |
| `agent-memory.delete` | DELETE agent-memory |
| `mcp-servers.read` | GET mcp-servers, POST regenerate |
