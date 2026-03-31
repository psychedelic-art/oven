# Architecture — Workflow Agents, MCP Server & Python Sidecar

> Design patterns, execution flows, and structural diagrams for all three packages.

---

## Design Patterns

### 1. Extension Pattern (module-workflow-agents)

Module-workflow-agents extends module-workflows by registering new node types in the existing Node Registry. It does not fork or replace the engine. The workflow engine's state machine loop, context accumulation, `$.path` resolution, and execution persistence remain unchanged.

```
Existing Node Registry
  +-- core.condition     (module-workflows)
  +-- core.transform     (module-workflows)
  +-- core.delay         (module-workflows)
  +-- core.emit          (module-workflows)
  +-- core.setVariable   (module-workflows)
  +-- core.sql           (module-workflows)
  +-- core.forEach       (module-workflows)
  +-- core.whileLoop     (module-workflows)
  +-- api.*              (auto-discovered from modules)
  |
  +-- agent.llm          (module-workflow-agents) <-- NEW
  +-- agent.toolExecutor (module-workflow-agents) <-- NEW
  +-- agent.toolLoop     (module-workflow-agents) <-- NEW
  +-- agent.memory.read  (module-workflow-agents) <-- NEW
  +-- agent.memory.write (module-workflow-agents) <-- NEW
  +-- agent.rag          (module-workflow-agents) <-- NEW
  +-- agent.humanReview  (module-workflow-agents) <-- NEW
  +-- agent.subagent     (module-workflow-agents) <-- NEW
  +-- agent.prompt       (module-workflow-agents) <-- NEW
  +-- agent.imageGen     (module-workflow-agents) <-- NEW
  +-- agent.embed        (module-workflow-agents) <-- NEW
  +-- core.checkQuota    (module-workflow-agents) <-- NEW
  +-- core.trackUsage    (module-workflow-agents) <-- NEW
```

Each new node type implements the same `AgentNode` interface that the workflow engine expects, with lifecycle hooks: `init`, `validate`, `execute`, `cleanup`.

### 2. Node Registry Pattern (Both JS and Python)

Nodes self-register with metadata that describes their identity, category, inputs, outputs, and description. The registry provides discovery for the visual editor (palette items), the engine (execution routing), and documentation (API descriptions).

**JavaScript registration** (in module-workflow-agents):
```typescript
nodeRegistry.register({
  id: 'agent.llm',
  category: 'llm',
  description: 'Invoke a language model with the current conversation state',
  inputs: { messages: 'Message[]', config: 'LLMConfig?' },
  outputs: { response: 'string', toolCalls: 'ToolCall[]?' },
  execute: async (state, config) => { /* ... */ },
});
```

**Python registration** (in agent-runtime-py):
```python
@register_node("agent.llm")
class LLMNode(BaseNode):
    category = "llm"
    description = "Invoke a language model via OVEN API"

    async def execute(self, state: AgentState) -> dict:
        response = await self.oven_client.post('/ai/generate', {...})
        return {"messages": state["messages"] + [response]}
```

### 3. Decorator Pattern (Python Sidecar)

The Python sidecar uses a decorator-based registry that mirrors the JavaScript pattern but follows Python conventions:

```python
node_registry = {}

def register_node(node_type: str):
    def decorator(cls):
        node_registry[node_type] = cls
        return cls
    return decorator
```

This enables automatic discovery of all Python node implementations without manual imports. The compiler queries the registry when building StateGraphs.

### 4. Builder Pattern (Both JS and Python)

The AgentGraphCompiler transforms a JSON workflow definition into an executable graph. In JavaScript it produces a LangGraph StateGraph; in Python it produces a compiled LangGraph graph with a PostgreSQL checkpointer.

```
JSON Definition
  |
  v
AgentGraphCompiler.compile(definition)
  |
  +-- For each state in definition.states:
  |     Resolve node class from registry
  |     Add node to StateGraph
  |
  +-- For each transition:
  |     If conditional: add_conditional_edges(source, router, targets)
  |     Else: add_edge(source, target)
  |
  +-- Configure checkpointer (PostgresSaver)
  |
  v
Compiled StateGraph (ready to execute)
```

### 5. Checkpoint Pattern

PostgreSQL-backed state persistence at every node boundary enables resume after failure, timeout, or human-in-the-loop pause.

```
Node A completes
  |
  v
CheckpointManager.save({
  executionId,
  currentState: "nodeB",
  context: { ...accumulated },
  messages: [...],
  nodeHistory: [...]
})
  |
  v
UPDATE agent_workflow_executions
  SET context = $checkpoint, currentState = "nodeB"
  WHERE id = $executionId
  |
  v
Node B begins (or resumes from checkpoint)
```

Checkpoint data includes:
- Current graph position (which state/node)
- Full accumulated context snapshot
- Conversation message history
- Pending tool calls (if any)
- Node execution history references

### 6. Generator Pattern (MCP Auto-Generation)

When `workflow.mcpExport = true`, the MCPGenerator reads the workflow definition and produces MCP tool definitions automatically.

```
agent_workflows (mcpExport=true)
  |
  v
MCPGenerator.generate(workflow)
  |
  +-- Extract workflow as top-level tool
  |     name: workflow.slug
  |     description: workflow.description
  |     inputSchema: derived from workflow.definition.input
  |
  +-- Extract bound module tools
  |     For each agent.toolExecutor node:
  |       Read tool bindings -> resolve via registry
  |       Generate MCP tool definition per bound tool
  |
  +-- Extract subagent references
  |     For each agent.subagent node:
  |       Generate MCP tool for the referenced agent
  |
  v
INSERT/UPDATE mcp_server_definitions
  SET toolDefinitions = $generatedTools
```

### 7. Adapter Pattern (Python Sidecar)

The Python sidecar adapts the OVEN API as tool calls via a REST client. Every operation that the JavaScript runtime performs via direct module imports, the Python runtime performs via HTTP calls to the OVEN API.

```python
class OvenClient:
    """REST adapter for OVEN API access from Python runtime."""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}

    async def generate(self, model: str, messages: list) -> dict:
        return await self.post('/ai/generate', {
            "model": model,
            "messages": messages,
        })

    async def search_kb(self, tenant_slug: str, query: str) -> list:
        return await self.post(
            f'/knowledge-base/{tenant_slug}/search',
            {"query": query}
        )
```

### 8. Strategy Pattern (Runtime Selection)

The execution engine selects between JavaScript and Python runtimes based on workflow configuration:

```
Execute workflow request
  |
  v
Check workflow.runtime config
  |
  +-- "js" (default) --> Execute via JS WorkflowEngine
  |     Direct in-process execution
  |     Full access to module internals
  |
  +-- "python" --> Delegate to Python sidecar
        POST {PYTHON_RUNTIME_URL}/execute
        Workflow JSON in request body
        Results returned via REST response
```

### 9. Observer Pattern (Execution Events)

The execution engine emits events at every state transition for real-time dashboard updates:

```
Execution starts
  --> emit 'agents-workflow.execution.started'

Node begins
  --> emit 'agents-workflow.node.started'

Node completes
  --> emit 'agents-workflow.node.completed'
  --> checkpoint saved

Execution paused (human review)
  --> emit 'agents-workflow.execution.paused'

Execution resumed
  --> emit 'agents-workflow.execution.resumed'

Execution completes
  --> emit 'agents-workflow.execution.completed'
```

The dashboard subscribes to these events to render real-time execution timelines, cost counters, and status badges.

### 10. Command Pattern (Human-in-the-Loop)

Human review decisions are modeled as commands that can be applied to a paused execution:

```
POST /api/agent-workflow-executions/:id/resume
{
  "action": "approve" | "edit" | "reject",
  "data": { /* optional modifications */ },
  "reason": "Looks good, proceed"
}
```

Each action maps to a different continuation:
- **approve**: Continue execution from checkpoint without changes
- **edit**: Merge modified data into context, then continue
- **reject**: Transition to error/fallback state, record rejection reason

---

## Execution Flow Diagrams

### Standard Agent Execution with Checkpointing

```
                    +-------------------+
                    |   Execute Request  |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  Load Definition   |
                    |  Compile Graph     |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  agent.prompt      |----> Checkpoint #1
                    |  Assemble system   |
                    |  prompt + context  |
                    +--------+----------+
                             |
                    +--------v----------+
                    | agent.memory.read  |----> Checkpoint #2
                    | Semantic retrieval |
                    | from agent memory  |
                    +--------+----------+
                             |
              +--------------v--------------+
              |      agent.toolLoop         |
              |  +------------------------+ |
              |  | agent.llm              | |----> Checkpoint #3
              |  | Send messages + tools  | |
              |  +----------+-------------+ |
              |             |               |
              |    +--------v--------+      |
              |    | Tool calls?     |      |
              |    +---+--------+----+      |
              |   Yes  |        | No        |
              |  +-----v------+ |           |
              |  | agent.tool | |           |
              |  | Executor   |---> Ckpt #4 |
              |  +-----+------+ |           |
              |        |  Loop  |           |
              |        +--------+           |
              |             |               |
              |        Final response       |
              +--------------+--------------+
                             |
                    +--------v----------+
                    | agent.memory.write |----> Checkpoint #5
                    | Persist key info   |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  Execution Done    |
                    |  Aggregate costs   |
                    |  Emit completed    |
                    +-------------------+
```

### MCP Generation Pipeline

```
  +--------------------+
  | agent_workflows    |
  | (mcpExport=true)   |
  +---------+----------+
            |
  +---------v----------+
  |  MCPGenerator       |
  |                     |
  |  1. Parse definition|
  |  2. Extract tools   |
  |  3. Extract agents  |
  +---------+----------+
            |
  +---------v-----------+     +------------------------+
  | mcp_server_          |     | mcp-server package     |
  | definitions          |---->| ToolGenerator          |
  | (toolDefinitions     |     | ResourceGenerator      |
  |  JSONB)              |     | PromptGenerator        |
  +----------------------+     +----------+-------------+
                                          |
                               +----------v-------------+
                               |  MCP Protocol Server    |
                               |                         |
                               |  tools/list             |
                               |  tools/call             |
                               |  resources/list         |
                               |  resources/read         |
                               |  prompts/list           |
                               |  prompts/get            |
                               +----------+--------------+
                                          |
                               +----------v--------------+
                               | External MCP Clients     |
                               | (Claude Desktop, agents) |
                               +-------------------------+
```

### Python Sidecar Communication

```
  +-------------------+         +----------------------+
  |  OVEN Dashboard   |         | agent-runtime-py     |
  |  (Next.js)        |         | (FastAPI + LangGraph)|
  +---------+---------+         +----------+-----------+
            |                              |
            | POST /execute                |
            | { workflowId, input }        |
            +----------------------------->|
            |                              |
            |                   +----------v-----------+
            |                   | Load workflow JSON    |
            |                   | from OVEN API         |
            |                   +----------+-----------+
            |                              |
            |                   +----------v-----------+
            |                   | AgentGraphCompiler    |
            |                   | JSON -> StateGraph    |
            |                   +----------+-----------+
            |                              |
            |                   +----------v-----------+
            |                   | Execute graph         |
            |                   | (LangSmith tracing)   |
            |                   |                       |
            |                   | Each node calls       |
            |                   | OVEN API via          |
            |                   | OvenClient            |
            |         +--------+----------+----------+--+
            |         |        |          |          |
            |    /ai/generate  /kb/search  /usage/track ...
            |         |        |          |          |
            |         +--------+----------+----------+
            |                              |
            |     { result, tokenUsage,    |
            |       costCents, status }    |
            |<-----------------------------+
            |                              |
  +---------v---------+         +----------+-----------+
  |  Record execution  |         | LangSmith traces     |
  |  in DB             |         | (if LANGSMITH_API_KEY)|
  +-------------------+         +----------------------+
```

### ReAct Tool Loop Detail

```
  +--------------------------------------------------+
  |               agent.toolLoop                      |
  |                                                   |
  |  iteration = 0                                    |
  |  maxIterations = config.MAX_TOOL_ITERATIONS       |
  |                                                   |
  |  +----------------------------------------------+ |
  |  |                                              | |
  |  |  +------------------+                        | |
  |  |  | agent.llm        |                        | |
  |  |  | Send messages    |                        | |
  |  |  | + available tools|                        | |
  |  |  +--------+---------+                        | |
  |  |           |                                  | |
  |  |  +--------v---------+                        | |
  |  |  | Response type?   |                        | |
  |  |  +--+----------+----+                        | |
  |  |     |          |                             | |
  |  |  text       toolCalls                        | |
  |  |     |          |                             | |
  |  |     |  +-------v----------+                  | |
  |  |     |  | agent.tool       |                  | |
  |  |     |  | Executor         |                  | |
  |  |     |  | (parallel or seq)|                  | |
  |  |     |  +-------+----------+                  | |
  |  |     |          |                             | |
  |  |     |  Append tool results to messages       | |
  |  |     |          |                             | |
  |  |     |  iteration++                           | |
  |  |     |          |                             | |
  |  |     |  +-------v----------+                  | |
  |  |     |  | iteration <      |--No--> Error:    | |
  |  |     |  | maxIterations?   |     max exceeded  | |
  |  |     |  +-------+----------+                  | |
  |  |     |       Yes|                             | |
  |  |     |          +-----> Loop back to LLM      | |
  |  |     |                                        | |
  |  +-----+----------------------------------------+ |
  |        |                                          |
  |  +-----v--------+                                 |
  |  | Final text    |                                 |
  |  | response      |                                 |
  |  +---------------+                                 |
  +--------------------------------------------------+
```

### Human-in-the-Loop Flow

```
  Normal execution flow
        |
  +-----v-----------+
  | agent.humanReview|
  | node reached     |
  +-----+-----------+
        |
  +-----v-----------+
  | Save checkpoint  |
  | to execution     |
  | record           |
  +-----+-----------+
        |
  +-----v-----------+
  | Set status =     |
  | 'paused'         |
  +-----+-----------+
        |
  +-----v-----------+
  | Emit event:      |
  | execution.paused |
  | { nodeId, reason,|
  |   proposedAction }|
  +-----+-----------+
        |
        |   Dashboard shows "Review Required" badge
        |   Reviewer sees proposed action + context
        |
  +-----v-----------+         +-----------------------+
  | Waiting for      |<--------| POST /executions/:id  |
  | human decision   |         |       /resume         |
  +-----+-----------+         | { action, data }      |
        |                      +-----------------------+
  +-----v-----------+
  | action?          |
  +--+------+-----+-+
     |      |     |
  approve  edit  reject
     |      |     |
     |   +--v--+  |
     |   |Merge|  |
     |   |data |  |
     |   +--+--+  |
     |      |     |
  +--v------v--+  |
  | Resume from |  |
  | checkpoint  |  +-----> Transition to
  | Continue    |          error/fallback
  | execution   |          state
  +-------------+
```

---

## Cross-Package Architecture

### Shared Concepts

All three packages share these foundational concepts from the broader OVEN platform:

1. **WorkflowDefinition format** -- JSON graph with states, transitions, guards, invocations. Both JS and Python runtimes consume the same definition format.

2. **Node Registry** -- Central catalog of available node types. JS has an in-memory registry populated at startup. Python has a decorator-based registry.

3. **Context accumulation** -- Each node reads from shared state, performs its action, and writes results back. `$.path` expressions enable declarative data routing between nodes.

4. **Execution persistence** -- Every execution is recorded with status, timing, cost, and error information at both the execution and node level.

5. **Event-driven integration** -- All lifecycle events are emitted through the EventBus for cross-module reactions and real-time UI updates.

### Package Boundaries

```
+------------------------------------------------------------------+
|                     module-workflow-agents                         |
|                                                                   |
|  ModuleDefinition:                                                |
|    schema (6 tables)                                              |
|    apiHandlers (18 endpoints)                                     |
|    events (14 events)                                             |
|    configSchema (7 keys)                                          |
|    resources (4 RA resources)                                     |
|    seed (permissions + sample workflow)                            |
|                                                                   |
|  Engine:                                                          |
|    AgentNodeExecutor -- routes to node implementations            |
|    CheckpointManager -- save/restore execution state              |
|    CostTracker -- per-node + aggregate cost                       |
|    MCPGenerator -- workflow -> MCP tool definitions               |
|    MemoryManager -- semantic read/write to agent_memory           |
|    13 node type implementations                                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|                         mcp-server                                |
|                                                                   |
|  Infrastructure (no ModuleDefinition):                            |
|    ToolGenerator -- actionSchemas -> MCP ToolDefinition[]         |
|    ResourceGenerator -- module metadata -> MCP Resource[]         |
|    PromptGenerator -- agent prompts -> MCP Prompt[]               |
|    Executor -- route tool calls to module APIs                    |
|    AuthMiddleware -- permission checking per tool                 |
|    RateLimitMiddleware -- per-tool rate limiting                  |
|    Transports: stdio (local) + HTTP (Vercel)                     |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|                      agent-runtime-py                              |
|                                                                   |
|  Python Sidecar (standalone):                                     |
|    FastAPI app with lifespan management                           |
|    AgentGraphCompiler -- JSON -> StateGraph                       |
|    NodeRegistry -- decorator-based node catalog                   |
|    OvenClient -- REST adapter for OVEN API                        |
|    AsyncPostgresSaver -- LangGraph checkpointer                   |
|    Pydantic BaseSettings for configuration                        |
|    Node implementations mirroring JS nodes                        |
+------------------------------------------------------------------+
```
