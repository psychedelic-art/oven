# Module Design — Workflow Agents, MCP Server & Python Sidecar

> High-level and low-level design for all three packages.
> Component breakdown, dependency graph, data flows, and internal structure.

---

## Dependency Graph

```
                    +-------------------+
                    | module-registry   |
                    | (EventBus, DB,    |
                    |  API utils)       |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v----------+
     | module-ai  |  | module-     |  | module-       |
     | (LLM,      |  | workflows  |  | agent-core    |
     | embeddings,|  | (engine,   |  | (Tool Wrapper,|
     | vector     |  |  node reg, |  |  invocation,  |
     | stores)    |  |  state     |  |  sessions)    |
     +-----+------+  | machine)   |  +----+----------+
           |         +------+------+       |
           |                |              |
           +--------+-------+---------+----+
                    |                  |
          +---------v------------------v---------+
          |      module-workflow-agents           |
          |  (13 agent node types, checkpointing,|
          |   cost tracking, MCP generation,      |
          |   memory management)                  |
          +---------+-------------------+---------+
                    |                   |
          +---------v--------+  +-------v-----------+
          |   mcp-server     |  | agent-runtime-py  |
          |  (tool gen,      |  | (Python LangGraph,|
          |   MCP protocol)  |  |  FastAPI, REST    |
          |                  |  |  adapter)          |
          +------------------+  +-------------------+
```

### Key dependency rules:
- `module-workflow-agents` depends on `module-workflows` for the engine and `module-agent-core` for tool discovery, but does NOT import their business logic directly. Communication flows through the Node Registry and EventBus.
- `mcp-server` depends only on `module-registry` for discovery. It reads `chat.actionSchemas` from all registered modules.
- `agent-runtime-py` is fully standalone. It communicates with the OVEN API exclusively via HTTP through its `OvenClient` adapter.

---

## Package 1: module-workflow-agents

### File Structure

```
packages/module-workflow-agents/
  package.json                          @oven/module-workflow-agents
  tsconfig.json
  src/
    index.ts                            ModuleDefinition export
    schema.ts                           6 Drizzle table definitions
    types.ts                            TypeScript types
    seed.ts                             Permissions + sample workflow

    engine/
      agent-node-executor.ts            Routes execution to node implementations
      checkpoint-manager.ts             Save/restore execution state
      cost-tracker.ts                   Per-node + aggregate cost tracking
      mcp-generator.ts                  Workflow -> MCP tool definitions
      memory-manager.ts                 Semantic read/write to agent_memory

      agent-nodes/
        agent-llm.ts                    agent.llm node
        agent-tool-executor.ts          agent.toolExecutor node
        agent-tool-loop.ts              agent.toolLoop node
        agent-memory-read.ts            agent.memory.read node
        agent-memory-write.ts           agent.memory.write node
        agent-rag.ts                    agent.rag node
        agent-human-review.ts           agent.humanReview node
        agent-subagent.ts               agent.subagent node
        agent-prompt.ts                 agent.prompt node
        agent-image-gen.ts              agent.imageGen node
        agent-embed.ts                  agent.embed node
        core-check-quota.ts             core.checkQuota node
        core-track-usage.ts             core.trackUsage node
        index.ts                        Barrel export + registry registration

    api/
      agent-workflows.handler.ts        GET (list) + POST (create)
      agent-workflows-by-id.handler.ts  GET + PUT + DELETE
      agent-workflows-versions.handler.ts       GET version history
      agent-workflows-restore.handler.ts        POST restore version
      agent-workflows-execute.handler.ts        POST trigger execution
      agent-workflow-executions.handler.ts       GET list executions
      agent-workflow-executions-by-id.handler.ts GET execution detail
      agent-workflow-executions-resume.handler.ts POST resume paused
      agent-workflow-executions-cancel.handler.ts POST cancel running
      agent-workflow-executions-nodes.handler.ts  GET node executions
      agent-memory.handler.ts                    GET + POST memory
      agent-memory-by-id.handler.ts              DELETE memory
      mcp-servers.handler.ts                     GET list MCP servers
      mcp-servers-by-id.handler.ts               GET MCP server detail
      mcp-servers-regenerate.handler.ts          POST regenerate
```

### Internal Components

#### AgentNodeExecutor

Central dispatcher that routes node execution to the correct implementation. Inherits from the workflow engine's node execution pipeline.

Responsibilities:
- Look up node type in registry
- Validate node inputs against schema
- Execute the node implementation
- Record node execution in `agent_workflow_node_executions`
- Track token usage and cost for LLM nodes
- Save checkpoint after completion
- Emit node lifecycle events

#### CheckpointManager

Manages state persistence for pause/resume workflows.

Responsibilities:
- Serialize execution state to JSONB (context, messages, current position)
- Save checkpoint to `agent_workflow_executions.checkpoint` column
- Restore checkpoint on resume (reload state, position, pending operations)
- Handle concurrent safety (optimistic locking via version check)
- Clean up checkpoint data after execution completes

#### CostTracker

Aggregates cost across all nodes in an execution.

Responsibilities:
- Record per-node token usage (`agent_workflow_node_executions.tokenUsage`)
- Record per-node cost (`agent_workflow_node_executions.costCents`)
- Compute execution-level aggregate (`agent_workflow_executions.totalCostCents`)
- Enforce execution cost cap (`EXECUTION_COST_CAP_CENTS` config)
- Abort execution if cost cap is exceeded (emit failure event)

#### MCPGenerator

Transforms workflow definitions into MCP server definitions.

Responsibilities:
- Parse workflow definition to extract tool bindings
- Generate MCP tool definition for the workflow itself
- Generate MCP tool definitions for each bound module tool
- Generate MCP tool definitions for referenced subagents
- Store generated definitions in `mcp_server_definitions` table
- Regenerate on workflow update (when `MCP_AUTO_REGENERATE` config is true)

#### MemoryManager

Manages long-term agent memory with semantic retrieval.

Responsibilities:
- Write: Extract key information, generate embedding via module-ai, store in `agent_memory`
- Read: Generate query embedding, perform vector similarity search, return top-K results
- Scope isolation: filter by `agentId` and optionally `userId`
- Configurable retrieval strategy via `memoryConfig`

### Data Flow: Workflow Execution

```
1. POST /api/agent-workflows/:id/execute
   |
2. Load agent_workflows record (definition, agentConfig, memoryConfig)
   |
3. Create agent_workflow_executions record (status: 'running')
   |
4. Emit 'agents-workflow.execution.started'
   |
5. For each state in the graph (following transitions):
   |
   a. Resolve node type from registry
   b. Create agent_workflow_node_executions record (status: 'running')
   c. Emit 'agents-workflow.node.started'
   d. Execute node (AgentNodeExecutor)
   e. If LLM node: track tokenUsage + costCents via CostTracker
   f. If cost cap exceeded: abort execution
   g. Update node record (status: 'completed', output, durationMs)
   h. Emit 'agents-workflow.node.completed'
   i. Save checkpoint via CheckpointManager
   j. Accumulate output to context ($.path resolution)
   k. Evaluate transition guards, determine next state
   |
6. If agent.humanReview node:
   a. Save full checkpoint
   b. Set execution status = 'paused'
   c. Emit 'agents-workflow.execution.paused'
   d. STOP (wait for resume API call)
   |
7. When all states complete:
   a. Aggregate costs across all nodes
   b. Set execution status = 'completed'
   c. Emit 'agents-workflow.execution.completed'
```

### Data Flow: MCP Generation

```
1. Workflow created/updated with mcpExport=true
   |
2. MCPGenerator.generate(workflow)
   |
3. Parse definition.states -> find all agent.toolExecutor nodes
   |
4. For each tool binding in executor nodes:
   a. Resolve tool via registry (module actionSchema or AI tool)
   b. Convert parameters to JSON Schema
   c. Build MCP ToolDefinition { name, description, inputSchema }
   |
5. Build top-level workflow tool:
   a. name = workflow.slug
   b. description = workflow.description
   c. inputSchema from workflow's declared inputs
   |
6. Find all agent.subagent nodes:
   a. For each referenced agent slug, generate a tool definition
   |
7. Combine all tool definitions
   |
8. Upsert into mcp_server_definitions table
   |
9. Emit 'agents-workflow.mcp.generated'
```

---

## Package 2: mcp-server

### File Structure

```
packages/mcp-server/
  package.json                          @oven/mcp-server
  tsconfig.json
  src/
    index.ts                            Export createMCPServer, ToolGenerator
    server.ts                           MCP server setup (@modelcontextprotocol/sdk)
    tool-generator.ts                   actionSchemas -> MCP ToolDefinition[]
    resource-generator.ts               Module metadata -> MCP Resource[]
    prompt-generator.ts                 Agent prompts -> MCP Prompt[]
    executor.ts                         Route tool calls to module APIs
    transport/
      stdio.ts                          StdioServerTransport (local dev)
      http.ts                           HTTP transport (Vercel serverless)
    middleware/
      auth.ts                           Permission checking per tool
      rate-limit.ts                     Per-tool rate limiting
      logging.ts                        Tool invocation logging
    types.ts
```

### Internal Components

#### ToolGenerator

Converts module actionSchemas into MCP tool definitions.

```
Input:  registry.getAll() -> ModuleDefinition[]

For each module:
  module.chat?.actionSchemas -> for each schema:
    {
      name: schema.name,
      description: schema.description,
      inputSchema: convertToJsonSchema(schema.parameters),
      handler: (args) => callModuleEndpoint(schema.endpoint, args)
    }

Output: MCP ToolDefinition[]
```

#### ResourceGenerator

Exposes module metadata as MCP resources for discovery.

```
For each module:
  {
    uri: `oven://modules/${module.name}`,
    name: module.name,
    description: module.chat?.description || module.name,
    mimeType: "application/json"
  }
```

#### PromptGenerator

Exposes agent system prompts as MCP prompts.

```
For each agent with a system prompt:
  {
    name: agent.slug,
    description: `System prompt for ${agent.name}`,
    arguments: agent.exposedParams.map(p => ({
      name: p.name,
      description: p.description,
      required: p.required
    }))
  }
```

#### Executor

Routes MCP tool calls to the correct module API endpoint.

```
tools/call request
  |
  v
Resolve tool -> find matching actionSchema
  |
  v
AuthMiddleware.check(user, schema.requiredPermissions)
  |
  v
RateLimitMiddleware.check(tool.name, user)
  |
  v
HTTP call to schema.endpoint (method + path + args)
  |
  v
Return result as MCP tool response
```

#### AuthMiddleware

Validates that the calling user has permission to invoke a specific tool.

```
For each tool call:
  1. Extract user identity from MCP session context
  2. Look up tool's requiredPermissions from actionSchema
  3. Check user's role has all required permissions
  4. If not: return MCP error (permission denied)
  5. If yes: proceed to Executor
```

### Data Flow: Tool Discovery and Execution

```
MCP Client (Claude Desktop, external agent)
  |
  | tools/list
  v
mcp-server
  |
  v
ToolGenerator.generate()
  |-- registry.getAll()
  |-- For each module with chat.actionSchemas:
  |     Convert to MCP ToolDefinition
  +-- Return combined tool list
  |
  | tools/call { name: "kb.searchEntries", args: {...} }
  v
Executor
  |
  |-- AuthMiddleware.check()
  |-- RateLimitMiddleware.check()
  |-- Resolve endpoint: POST /api/knowledge-base/:slug/search
  |-- HTTP call with args
  |-- Return result
```

---

## Package 3: agent-runtime-py

### File Structure

```
packages/agent-runtime-py/
  pyproject.toml                        Dependencies: langgraph, langchain, fastapi, pydantic, asyncpg
  Dockerfile                            Container build for deployment
  vercel.json                           Serverless Python config
  requirements.txt                      Pinned dependencies
  src/
    api/
      main.py                           FastAPI app with lifespan (checkpointer init)
      routers/
        agent_router.py                 /execute, /stream, /health, /nodes
    workflows/
      compiler.py                       JSON definition -> StateGraph
      graph.py                          StateGraph construction helpers
      state.py                          Pydantic AgentState model
      routes.py                         Conditional routing functions
      nodes/
        base.py                         BaseNode class + register_node decorator
        llm_node.py                     agent.llm -> call OVEN /ai/generate
        tool_executor_node.py           agent.toolExecutor -> call OVEN tool endpoints
        tool_loop_node.py               agent.toolLoop -> ReAct cycle
        memory_node.py                  agent.memory.read/write
        rag_node.py                     agent.rag
        human_review_node.py            agent.humanReview
        subagent_node.py                agent.subagent
        quota_node.py                   core.checkQuota, core.trackUsage
    adapters/
      oven_client.py                    REST client for OVEN API (auth, retry, error handling)
    settings/
      config.py                         Pydantic BaseSettings
    db/
      checkpointer.py                   AsyncPostgresSaver for state persistence
  tests/
    test_compiler.py
    test_nodes.py
    test_routes.py
    test_oven_client.py
```

### Internal Components

#### AgentGraphCompiler

Transforms JSON workflow definitions into executable LangGraph StateGraphs.

```python
class AgentGraphCompiler:
    def compile(self, workflow_definition: dict) -> CompiledGraph:
        graph = StateGraph(AgentState)

        # Add nodes from definition
        for node_id, node_config in workflow_definition["states"].items():
            node_cls = node_registry[node_config["invoke"]["src"]]
            node_instance = node_cls(node_config, self.oven_client)
            graph.add_node(node_id, node_instance.execute)

        # Add edges (normal and conditional)
        for edge in self._extract_edges(workflow_definition):
            if edge.conditional:
                graph.add_conditional_edges(
                    edge.source, edge.router, edge.targets
                )
            else:
                graph.add_edge(edge.source, edge.target)

        # Set entry point
        graph.set_entry_point(workflow_definition["initial"])

        return graph.compile(checkpointer=self.checkpointer)
```

#### NodeRegistry

Decorator-based registry that collects all Python node implementations.

```python
node_registry: dict[str, type[BaseNode]] = {}

def register_node(node_type: str):
    def decorator(cls):
        node_registry[node_type] = cls
        return cls
    return decorator
```

All node files in `src/workflows/nodes/` use the `@register_node` decorator. The registry is populated at import time.

#### OvenClient

HTTP adapter for all OVEN API communication from the Python sidecar.

```python
class OvenClient:
    base_url: str
    api_key: str
    session: aiohttp.ClientSession

    async def post(self, path: str, data: dict) -> dict
    async def get(self, path: str, params: dict = None) -> dict

    # Convenience methods
    async def generate(self, model, messages, tools=None) -> dict
    async def embed(self, text: str) -> list[float]
    async def search_kb(self, tenant_slug, query) -> list
    async def check_quota(self, tenant_id, service_slug, amount) -> dict
    async def track_usage(self, tenant_id, service_slug, amount, metadata) -> dict
```

Features: automatic retry with exponential backoff, API key injection, error mapping (HTTP status to Python exceptions), request/response logging.

#### AsyncPostgresSaver

LangGraph-compatible checkpointer backed by PostgreSQL.

```python
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

class OvenCheckpointer(AsyncPostgresSaver):
    """Extended checkpointer with OVEN-specific checkpoint metadata."""

    async def aput(self, config, checkpoint, metadata):
        # Save checkpoint + update OVEN execution record
        await super().aput(config, checkpoint, metadata)
        await self.oven_client.post(
            f'/agent-workflow-executions/{config["execution_id"]}',
            {"checkpoint": checkpoint, "currentState": metadata.get("current_state")}
        )
```

### Data Flow: Python Execution

```
1. POST /execute { workflowId: 42, input: {...} }
   |
2. OvenClient.get('/agent-workflows/42') -> workflow definition JSON
   |
3. AgentGraphCompiler.compile(definition) -> CompiledGraph
   |
4. graph.ainvoke(input, config={"configurable": {"thread_id": execution_id}})
   |
5. For each node in graph traversal:
   |
   a. Node.execute(state) called
   b. Node calls OVEN API via OvenClient:
      - LLMNode: POST /ai/generate
      - ToolExecutorNode: POST /api/{module}/{action}
      - MemoryNode: GET/POST /api/agent-memory
      - QuotaNode: POST /api/usage/track or check
   c. LangSmith traces each step (if LANGSMITH_API_KEY set)
   d. Checkpoint saved via AsyncPostgresSaver
   |
6. Return final state as JSON response
```

---

## Coexistence with Other Modules

### module-workflows (parent engine)

module-workflow-agents does not modify module-workflows. It registers new node types using the public Node Registry API. The workflow engine treats agent nodes identically to core nodes during execution -- it calls the node's `execute` function and accumulates the output.

The agent-specific extensions (checkpointing, cost tracking, streaming) are layered on top as middleware around the execution loop, not as modifications to it.

### module-agent-core (tool source)

The Tool Wrapper from module-agent-core provides the tool catalog that `agent.toolExecutor` nodes use. The workflow-agents module queries this catalog at execution time to resolve tool bindings to concrete API endpoints. It does not import the Tool Wrapper directly -- it uses the registry to discover tool definitions.

### module-ai (AI services)

All AI operations flow through module-ai's provider registry and middleware chain. The `agent.llm` node resolves models through module-ai's provider registry. The `agent.memory.*` nodes use module-ai's embedding and vector store tools. This ensures usage tracking, rate limiting, and guardrails apply uniformly.

### module-subscriptions (quota enforcement)

The `core.checkQuota` and `core.trackUsage` nodes call module-subscriptions' API endpoints to check and record usage. This enables workflow-level quota enforcement where an agent can check whether the tenant has remaining quota before performing an expensive operation.

### All other modules

Any module's API endpoints are available as tools within agent workflows through the inherited Tool Wrapper. The MCP server package additionally exposes all module capabilities as MCP tools for external consumption.
