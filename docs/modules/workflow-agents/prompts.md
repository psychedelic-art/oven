# Module Workflow Agents + MCP Server + Python Sidecar — Implementation Prompt

> Condensed directive for implementing `packages/module-workflow-agents`, `packages/mcp-server`, and `packages/agent-runtime-py`.
> References all docs in this folder. Use as baseline context for any implementation agent.

---

## Identity

### module-workflow-agents
- **Package**: `packages/module-workflow-agents`
- **Name**: `@oven/module-workflow-agents`
- **Type**: ModuleDefinition (full module)
- **Phase**: 5 (final — depends on all previous modules)
- **Dependencies**: `module-registry`, `module-workflows`, `module-agent-core`, `module-ai`

### mcp-server
- **Package**: `packages/mcp-server`
- **Name**: `@oven/mcp-server`
- **Type**: Infrastructure package (no ModuleDefinition)
- **Phase**: 5

### agent-runtime-py
- **Package**: `packages/agent-runtime-py`
- **Name**: Python sidecar (FastAPI + LangGraph Python)
- **Type**: Monorepo Python package with Dockerfile
- **Phase**: 5

## Mission

**module-workflow-agents**: Graph-based AI agent orchestration. Extends `module-workflows`' execution engine with agent-specific nodes (LLM, tool executor, tool loop, memory, RAG, human-in-the-loop, subagent). Supports checkpointing for pause/resume, auto-generates MCP server definitions, and provides a visual editor for agent workflows.

**mcp-server**: Internal MCP wrapper that auto-discovers all module `chat.actionSchemas` and generates MCP tool definitions. Serves as a bridge between OVEN modules and any MCP-compatible AI system (Claude Desktop, external agents, other OVEN agents).

**agent-runtime-py**: Python LangGraph runtime as a Vercel serverless sidecar. Same agent workflow definitions compiled to Python LangGraph StateGraphs. LangSmith tracing built-in. Communicates with OVEN API via REST.

## Key Constraints

- **module-workflow-agents**: Extends existing `module-workflows` engine — inherits state machine, node registry, context accumulation, `$.path` expressions. Does NOT create a new engine.
- **mcp-server**: Uses `@modelcontextprotocol/sdk`. Supports stdio (local dev) and HTTP (Vercel) transports.
- **agent-runtime-py**: Python 3.11+, FastAPI, `langgraph>=0.2.70`, `langchain>=0.2.14`. Deployed as Vercel serverless Python function.
- **Quota nodes**: `core.checkQuota` and `core.trackUsage` nodes for workflow-level quota management.
- **Cost tracking**: Every execution aggregates cost across all nodes (per-node tokenUsage + cost).
- **TDD**: Tests before implementation for all three packages.

## Architecture (see `architecture.md`)

### module-workflow-agents

**Extends module-workflows with new node types registered in the Node Registry**:

| Node Type | Category | Description |
|-----------|----------|-------------|
| `agent.llm` | llm | LLM invocation via module-ai. Resolves model through provider registry. Supports streaming. |
| `agent.toolExecutor` | tool | Execute tool calls from LLM. Resolves via Tool Wrapper. Parallel or sequential. |
| `agent.toolLoop` | loop | ReAct cycle: LLM → tools → LLM until final response or max iterations. |
| `agent.memory.read` | memory | Semantic retrieval from agent memory via module-ai embeddings + vector store. |
| `agent.memory.write` | memory | Extract and persist key information to agent memory store. |
| `agent.rag` | data | Retrieval-Augmented Generation: search vector store → inject context → generate. |
| `agent.humanReview` | human | Pause execution for human approval. Checkpoint state. Resume via API. |
| `agent.subagent` | utility | Invoke another agent as subgraph. Pass context, receive response. |
| `agent.prompt` | transform | Dynamic prompt assembly from templates + `$.path` context variables. |
| `agent.imageGen` | utility | Image generation via module-ai. |
| `agent.embed` | utility | Text embedding via module-ai. |
| `core.checkQuota` | data | Pre-flight quota check. Returns { allowed, remaining, limit, used }. |
| `core.trackUsage` | data | Record custom metered usage for a service. |

**Execution Model**:
- Inherits WorkflowEngine's state machine loop
- Extended with streaming support (token-by-token from LLM nodes)
- Checkpointing at every node completion → resume after failure/pause
- Per-node cost tracking: each LLM node records tokenUsage + upstreamCost
- Execution-level aggregate: sum of all node costs
- Configurable execution cost cap (safety limit)

**MCP Auto-Generation**:
When `agent_workflows.mcpExport = true`:
1. Read workflow definition → extract all tool bindings + node types
2. Generate MCP tool definitions for: the workflow itself (as invocable tool), all bound module tools, subagents
3. Store in `mcp_server_definitions` table
4. Regenerate on workflow definition change (if `MCP_AUTO_REGENERATE` config = true)

### mcp-server

**Tool Generation Flow**:
```
registry.getAll() → for each module:
  module.chat?.actionSchemas → generate MCP tool definition:
    - name: actionSchema.name
    - description: actionSchema.description
    - inputSchema: convert parameters to JSON Schema
    - handler: HTTP call to actionSchema.endpoint
→ Combine all tools into MCP server
→ Serve via stdio (local) or HTTP (Vercel serverless)
```

**Key Components**:
- `ToolGenerator` — actionSchemas → MCP ToolDefinition[]
- `ResourceGenerator` — module metadata → MCP Resource[]
- `PromptGenerator` — agent system prompts → MCP Prompt[]
- `AuthMiddleware` — validate permission before tool execution
- `RateLimitMiddleware` — per-tool rate limiting

### agent-runtime-py

**Node Registry Pattern** (Python decorator):
```python
node_registry = {}

def register_node(node_type: str):
    def decorator(cls):
        node_registry[node_type] = cls
        return cls
    return decorator

@register_node("agent.llm")
class LLMNode(BaseNode):
    async def execute(self, state: AgentState) -> dict:
        # Call OVEN API's /ai/generate endpoint
        response = await self.oven_client.post('/ai/generate', {...})
        return {"messages": state["messages"] + [response]}
```

**Compile Pattern** (Builder → StateGraph):
```python
class AgentGraphCompiler:
    def compile(self, workflow_definition: dict) -> CompiledGraph:
        graph = StateGraph(AgentState)
        for node_id, node_config in workflow_definition["states"].items():
            node_cls = node_registry[node_config["invoke"]["src"]]
            graph.add_node(node_id, node_cls(node_config))
        # Add edges from definition
        for edge in self._extract_edges(workflow_definition):
            if edge.conditional:
                graph.add_conditional_edges(edge.source, edge.router, edge.targets)
            else:
                graph.add_edge(edge.source, edge.target)
        return graph.compile(checkpointer=PostgresSaver(...))
```

**LangSmith**: Optional via `LANGSMITH_API_KEY` env var. When set, all executions are traced automatically.

## Database — module-workflow-agents (see `database.md`)

6 tables:

**`agent_workflows`** — Graph definitions
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenantId | integer (nullable) | Global workflows |
| name | varchar(255) | |
| slug | varchar(128) UNIQUE | |
| description | text | |
| definition | jsonb NOT NULL | Extended WorkflowDefinition format |
| agentConfig | jsonb | Default LLM config for all LLM nodes |
| memoryConfig | jsonb | { enabled, scope, retrievalStrategy } |
| mcpExport | boolean, default false | Auto-generate MCP server |
| enabled | boolean, default true | |
| version | integer, default 1 | |
| createdAt, updatedAt | timestamp | |

**`agent_workflow_versions`** — Snapshots

**`agent_workflow_executions`** — Execution records
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| agentWorkflowId | integer NOT NULL | |
| tenantId | integer (nullable) | |
| agentId | integer (nullable) | Which agent triggered |
| sessionId | integer (nullable) | Chat session context |
| status | varchar | 'running', 'paused', 'completed', 'failed' |
| currentState | varchar | Current graph position |
| context | jsonb | Accumulated context snapshot |
| checkpoint | jsonb (nullable) | For pause/resume |
| triggerEvent | varchar (nullable) | |
| tokenUsage | jsonb | { input, output, total } aggregate |
| totalCostCents | integer | Sum across all nodes |
| startedAt, completedAt | timestamp | |
| error | text (nullable) | |

**`agent_workflow_node_executions`** — Per-node tracking
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| executionId | integer NOT NULL | |
| nodeId | varchar(128) | State name |
| nodeType | varchar(64) | agent.llm, agent.toolExecutor, etc. |
| status | varchar | 'running', 'completed', 'failed', 'paused' |
| input | jsonb | Resolved inputs |
| output | jsonb | Node output |
| tokenUsage | jsonb (nullable) | For LLM nodes |
| costCents | integer (nullable) | Upstream cost |
| toolCalls | jsonb (nullable) | For tool executor nodes |
| error | text (nullable) | |
| durationMs | integer (nullable) | |
| startedAt, completedAt | timestamp | |

**`agent_memory`** — Long-term memory
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| agentId | integer NOT NULL | |
| userId | integer (nullable) | User-scoped memory |
| key | varchar(255) | Topic/category |
| content | text | The memory content |
| embedding | vector(1536) (nullable) | For semantic retrieval |
| metadata | jsonb | { sourceSessionId, relevanceScore } |
| createdAt, updatedAt | timestamp | |

**`mcp_server_definitions`** — Auto-generated MCP configs
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| agentWorkflowId | integer NOT NULL | |
| name | varchar(255) | |
| slug | varchar(128) UNIQUE | |
| toolDefinitions | jsonb | Array of MCP tool specs |
| status | varchar | 'active', 'disabled' |
| lastGeneratedAt | timestamp | |
| createdAt, updatedAt | timestamp | |

## API Endpoints (see `api.md`)

### module-workflow-agents (18 endpoints)
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | /api/agent-workflows | List/create |
| GET/PUT/DELETE | /api/agent-workflows/[id] | CRUD |
| GET | /api/agent-workflows/[id]/versions | Version history |
| POST | /api/agent-workflows/[id]/versions/[versionId]/restore | Restore |
| POST | /api/agent-workflows/[id]/execute | Manual trigger |
| GET | /api/agent-workflow-executions | List executions |
| GET | /api/agent-workflow-executions/[id] | Execution detail |
| POST | /api/agent-workflow-executions/[id]/resume | Resume paused |
| POST | /api/agent-workflow-executions/[id]/cancel | Cancel running |
| GET | /api/agent-workflow-executions/[id]/nodes | Node execution list |
| GET/POST | /api/agent-memory | Memory CRUD |
| DELETE | /api/agent-memory/[id] | Delete memory |
| GET | /api/mcp-servers | List MCP definitions |
| GET | /api/mcp-servers/[id] | MCP detail |
| POST | /api/mcp-servers/[id]/regenerate | Regenerate MCP |

### mcp-server (MCP protocol endpoints)
- `tools/list` → all tools from all modules
- `tools/call` → execute tool (routes to module API)
- `resources/list` → module metadata
- `resources/read` → module detail
- `prompts/list` → agent system prompts
- `prompts/get` → parameterized prompt

### agent-runtime-py (FastAPI endpoints)
- `POST /execute` — Execute workflow (blocking)
- `POST /stream` — Execute workflow (SSE streaming)
- `GET /health` — Health check
- `GET /nodes` — List registered Python node types

## Events

| Event | Payload |
|-------|---------|
| `agents-workflow.workflow.created/updated/deleted` | id, name, slug, tenantId |
| `agents-workflow.execution.started` | id, agentWorkflowId, agentId, tenantId |
| `agents-workflow.execution.completed` | id, agentWorkflowId, status, tokenUsage, totalCostCents |
| `agents-workflow.execution.failed` | id, agentWorkflowId, error |
| `agents-workflow.execution.paused` | id, agentWorkflowId, nodeId, reason |
| `agents-workflow.execution.resumed` | id, agentWorkflowId, decision |
| `agents-workflow.node.started/completed/failed` | executionId, nodeId, nodeType, durationMs |
| `agents-workflow.memory.created/deleted` | id, agentId, key |
| `agents-workflow.mcp.generated` | mcpServerId, agentWorkflowId |

## Seed Data

1. Permissions: `agent-workflows.read/create/update/delete/execute`, `agent-workflow-executions.read/resume/cancel`, `agent-memory.read/create/delete`, `mcp-servers.read`
2. Built-in agent node definitions registered in workflow Node Registry (the 13 node types above)
3. Optional: sample "dental-faq-workflow" demonstrating ReAct pattern with KB search

## Config Schema

| Key | Type | Default | Instance-Scoped |
|-----|------|---------|:---:|
| `MAX_TOOL_ITERATIONS` | number | 10 | Yes |
| `CHECKPOINT_ENABLED` | boolean | true | No |
| `MCP_AUTO_REGENERATE` | boolean | true | No |
| `EXECUTION_TIMEOUT_MS` | number | 300000 | Yes |
| `EXECUTION_COST_CAP_CENTS` | number | 1000 | Yes |
| `MEMORY_RETRIEVAL_TOP_K` | number | 5 | Yes |
| `PYTHON_RUNTIME_URL` | string | '' | No |

## Dashboard UI (see `UI.md`)

13 component files in `apps/dashboard/src/components/agent-workflows/`:
- WorkflowList, WorkflowCreate, WorkflowEdit (+ "Open Visual Editor" button), WorkflowShow
- ExecutionList, ExecutionShow (node-by-node timeline with cost breakdown)
- MemoryList, MemoryCreate, MemoryShow
- McpServerList, McpServerShow (tool definitions with schemas, "Regenerate" button)
- GuardrailConfigEditor (input/output rules with regex/keyword/classifier)
- AgentWorkflowEditorPage (extends workflow-editor with agent node palette)

Menu section: `──── Agent Workflows ────` with Agent Workflows, Executions, Memory, MCP Servers

## mcp-server Package Structure

```
packages/mcp-server/
  package.json
  tsconfig.json
  src/
    index.ts                    ← Export createMCPServer, ToolGenerator
    server.ts                   ← MCP server setup (@modelcontextprotocol/sdk)
    tool-generator.ts           ← actionSchemas → MCP ToolDefinition[]
    resource-generator.ts       ← Module metadata → MCP Resource[]
    prompt-generator.ts         ← Agent prompts → MCP Prompt[]
    executor.ts                 ← Route tool calls to module APIs
    transport/
      stdio.ts                  ← StdioServerTransport (local dev)
      http.ts                   ← HTTP transport (Vercel serverless)
    middleware/
      auth.ts                   ← Permission checking per tool
      rate-limit.ts             ← Per-tool rate limiting
      logging.ts                ← Tool invocation logging
    types.ts
```

## agent-runtime-py Package Structure

```
packages/agent-runtime-py/
  pyproject.toml                ← langgraph, langchain, fastapi, pydantic, asyncpg
  Dockerfile
  vercel.json                   ← { "functions": { "src/api/main.py": { "runtime": "python3.11" } } }
  requirements.txt
  src/
    api/
      main.py                   ← FastAPI app with lifespan (checkpointer init)
      routers/
        agent_router.py          ← /execute, /stream, /health, /nodes
    workflows/
      compiler.py                ← JSON definition → StateGraph
      graph.py                   ← StateGraph construction
      state.py                   ← Pydantic AgentState model
      routes.py                  ← Conditional routing functions
      nodes/
        base.py                  ← BaseNode class + register_node decorator
        llm_node.py              ← agent.llm → call OVEN /ai/generate
        tool_executor_node.py    ← agent.toolExecutor → call OVEN tool endpoints
        tool_loop_node.py        ← agent.toolLoop → ReAct cycle
        memory_node.py           ← agent.memory.read/write
        rag_node.py              ← agent.rag
        human_review_node.py     ← agent.humanReview
        subagent_node.py         ← agent.subagent
        quota_node.py            ← core.checkQuota, core.trackUsage
    adapters/
      oven_client.py             ← REST client for OVEN API (auth, retry, error handling)
    settings/
      config.py                  ← Pydantic BaseSettings (OVEN_API_URL, API_KEY, LANGSMITH_*)
    db/
      checkpointer.py            ← AsyncPostgresSaver for state persistence
  tests/
    test_compiler.py
    test_nodes.py
    test_routes.py
```

## Security (see `secure.md`)

- Human-in-the-loop: only authorized reviewers can resume paused executions
- Execution cost cap: configurable max cost per execution (prevent runaway costs)
- MCP server: permission-aware tool execution (respects user's role permissions)
- Memory isolation: agent memory scoped by agentId + optional userId
- Python sidecar: communicates via API key (stored in env, validated on every request)
- Checkpoint data: may contain conversation content — encrypted at rest
- Tool execution: sandboxed within user's permission scope

## Test Plan (TDD)

### module-workflow-agents
1. `agent-nodes/*.test.ts` — Each of 13 node types: init, validate, execute, cleanup
2. `mcp-generator.test.ts` — Generate MCP from workflow, tool extraction, regeneration
3. `checkpoint-manager.test.ts` — Save, load, resume, concurrent safety
4. `cost-tracker.test.ts` — Per-node cost, execution aggregate, cost cap enforcement
5. `api/agent-workflows.test.ts` — CRUD, versioning, execution trigger
6. `api/executions.test.ts` — List, detail, resume, cancel

### mcp-server
7. `tool-generator.test.ts` — actionSchemas → MCP tools, schema conversion
8. `executor.test.ts` — Route tool call to API, handle errors, permission check
9. `server.test.ts` — MCP protocol compliance, tool list, tool call

### agent-runtime-py
10. `test_compiler.py` — JSON definition → StateGraph compilation
11. `test_nodes.py` — Each Python node type execution
12. `test_routes.py` — Conditional routing functions
13. `test_oven_client.py` — API client retry, auth, error handling
