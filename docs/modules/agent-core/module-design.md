# Module Agent Core -- Module Design

> Dependency graph, internal component architecture, data flow, and integration boundaries.

---

## Dependency Graph

```
                        +-------------------+
                        | module-agent-core |
                        +--------+----------+
                                 |
              +------------------+------------------+
              |                  |                  |
              v                  v                  v
        +-----------+    +-----------+    +----------------+
        | module-ai |    | module-   |    | module-roles   |
        |           |    | registry  |    | (permissions)  |
        +-----------+    +-----------+    +----------------+

  Depended on by:
        +------------+    +-------------------+    +-----------+
        | module-chat|    | module-workflow-   |    | agent-ui  |
        |            |    | agents             |    | (package) |
        +------------+    +-------------------+    +-----------+
```

### Direct Dependencies

| Module | Why |
|--------|-----|
| `module-registry` | Enumerate all registered modules and their API endpoints for tool discovery. Read `chat.actionSchemas` for rich tool descriptions. |
| `module-ai` | Execute all LLM calls (generateText, streamText, generateObject). Resolve model aliases. Access AI tool catalog (`ai.*` tools). |
| `module-roles` | Validate that the invoking user has permission to call each tool endpoint the agent attempts to use during execution. |

### Indirect Dependencies (Runtime)

| Module | Why |
|--------|-----|
| `module-subscriptions` | Pre-flight quota check before agent execution. Post-execution usage tracking (tokens consumed). |
| `module-config` | Resolve per-tenant configuration values (default model, max tokens, execution timeout). |

### Dependents

| Module | How It Uses Agent Core |
|--------|----------------------|
| `module-chat` | Routes chat messages to agents. Discovers agents through their registry `chat` block. Uses `AgentInvoker` for execution. |
| `module-workflow-agents` | Extends agent definitions with complex multi-step graph topologies. Provides the `WorkflowStrategy` execution backend. |
| `agent-ui` (package) | Provides the playground React component that invokes agents via the streaming endpoint. |

---

## Internal Components

Agent Core is composed of seven internal components, each with a single responsibility:

```
  +---------------------------------------------------------------+
  |                     module-agent-core                          |
  |                                                                |
  |  +------------------+    +------------------+                  |
  |  |  AgentInvoker    |    |  ToolWrapper     |                  |
  |  |  (orchestrator)  |    |  (discovery +    |                  |
  |  |                  |--->|   execution)     |                  |
  |  +--------+---------+    +--------+---------+                  |
  |           |                       |                            |
  |           v                       v                            |
  |  +------------------+    +------------------+                  |
  |  |  GraphBuilder    |    |  NodeRegistry    |                  |
  |  |  (compile agent  |<---|  (built-in node  |                  |
  |  |   to StateGraph) |    |   definitions)   |                  |
  |  +--------+---------+    +------------------+                  |
  |           |                                                    |
  |           v                                                    |
  |  +------------------+    +------------------+                  |
  |  |  SessionManager  |    |  ExecutionTracker|                  |
  |  |  (conversation   |    |  (logging,       |                  |
  |  |   persistence)   |    |   metrics)       |                  |
  |  +------------------+    +------------------+                  |
  |                                                                |
  |  +------------------+                                          |
  |  |  StreamingAdapter|                                          |
  |  |  (SSE response   |                                          |
  |  |   formatting)    |                                          |
  |  +------------------+                                          |
  +---------------------------------------------------------------+
```

### AgentInvoker

The central orchestrator. Receives invocation requests, coordinates all other components, and returns the response.

**Responsibilities:**
- Load agent definition from database by slug.
- Validate and merge exposed parameter overrides.
- Delegate to the appropriate execution strategy (single-turn, multi-turn, workflow).
- Coordinate session creation/resumption.
- Trigger pre-flight quota checks.
- Emit platform events (`agents.execution.started`, `agents.execution.completed`).

**Does not:**
- Execute LLM calls directly (delegates to graph nodes via `module-ai`).
- Manage HTTP response formatting (delegates to `StreamingAdapter`).
- Know about specific node implementations (delegates to `NodeRegistry`).

### ToolWrapper

Discovers and executes tools on behalf of agents.

**Responsibilities:**
- Query `registry.getAll()` to enumerate module API endpoints.
- Parse `chat.actionSchemas` for rich tool descriptions.
- Auto-generate tool definitions for endpoints without explicit schemas.
- Cache the tool catalog with periodic refresh.
- Filter tools by an agent's `toolBindings` configuration.
- Execute tool calls: resolve endpoint, construct HTTP request, execute with user permissions, return result.
- Validate user permissions before each tool execution via `module-roles`.

**Internal state:**
- `toolCatalog: Map<string, ToolDefinition>` -- cached tool definitions.
- `lastRefreshAt: Date` -- timestamp of last registry refresh.
- `refreshIntervalMs: number` -- from `TOOL_WRAPPER_REFRESH_INTERVAL` config.

### GraphBuilder

Compiles agent definitions into executable LangGraph StateGraphs.

**Responsibilities:**
- Provide fluent API for graph construction (addNode, addEdge, addConditionalEdge, setEntryPoint).
- Validate graph topology (reachability, exhaustive conditional branches, no orphans).
- Apply lifecycle decorators to each node (logging, timing, quota, error handling, timeout).
- Configure PostgreSQL checkpointer for state persistence.
- Compile to executable `StateGraph`.

**Does not:**
- Know about specific agent definitions (receives generic config).
- Execute graphs (returns compiled graph to the invoker).

### NodeRegistry

Maintains the library of available node types.

**Responsibilities:**
- Register built-in node types (LLM, Tool, Condition, Transform, HumanReview, Memory).
- Allow custom node type registration (from `module-workflow-agents` or plugins).
- Resolve node type by slug or category.
- Provide node schemas for the dashboard UI (input/output/config declarations).

**Built-in nodes:**

| Slug | Class | Purpose |
|------|-------|---------|
| `llm` | `LLMNode` | Invoke language model via `module-ai` |
| `tool` | `ToolExecutorNode` | Execute tool calls, return results |
| `condition` | `ConditionNode` | Evaluate state, determine branch |
| `transform` | `TransformNode` | Reshape state data (map, filter, enrich) |
| `human-in-the-loop` | `HumanReviewNode` | Pause execution, wait for approval |
| `memory` | `MemoryNode` | Read/write long-term memory store |

### SessionManager

Handles conversation persistence and context accumulation.

**Responsibilities:**
- Create new sessions (with agent reference, user reference, optional title).
- Load existing sessions with full message history.
- Append messages to sessions (user, assistant, system, tool).
- Manage session status transitions (active, archived).
- Flag playground sessions (`isPlayground: true`).
- Prune old sessions based on retention policy.

### ExecutionTracker

Records every agent invocation for observability and cost tracking.

**Responsibilities:**
- Create execution records at invocation start (status: `running`).
- Update execution records at completion (tokens, latency, tools used, status).
- Update execution records on failure (error message, partial token usage).
- Provide aggregation queries for dashboard stats (avg tokens, avg latency, error rate).

### StreamingAdapter

Formats agent responses for HTTP delivery.

**Responsibilities:**
- Convert LangGraph execution events into SSE format (`text/event-stream`).
- Buffer and flush tokens for smooth streaming delivery.
- Format tool call events as structured SSE data.
- Send completion event with aggregated metadata.
- Support non-streaming mode (collect all output, return as JSON).

---

## Data Flow: Full Invocation

```
  1. HTTP Request
     POST /api/agents/dental-faq/invoke
     {
       messages: [{ role: "user", content: [{ type: "text", text: "..." }] }],
       params: { temperature: 0.1 },
       sessionId: 42,
       stream: true
     }

  2. Route Handler
     |-- Parse request body
     |-- Extract slug from URL path
     |-- Pass to AgentInvoker.invoke()

  3. AgentInvoker
     |
     |-- [Load Agent]
     |   DB: SELECT * FROM agents WHERE slug = 'dental-faq' AND enabled = true
     |   Result: { id: 7, llmConfig: {...}, systemPrompt: "...", toolBindings: [...], ... }
     |
     |-- [Merge Params]
     |   Agent.exposedParams = ["temperature", "maxTokens"]
     |   Request.params = { temperature: 0.1 }
     |   Effective llmConfig = { ...agent.llmConfig, temperature: 0.1 }
     |   (maxTokens not overridden -- uses agent default)
     |
     |-- [Resolve Tools]
     |   ToolWrapper.getToolsForAgent(agent)
     |   1. Get full catalog from ToolRegistry (cached)
     |   2. Filter: agent.toolBindings = ["kb.searchEntries", "kb.getEntry"]
     |   3. Return 2 ToolDefinition objects
     |
     |-- [Load Session]
     |   SessionManager.getOrCreate(sessionId: 42, agentId: 7, userId: currentUser)
     |   1. Load session record
     |   2. Load message history: SELECT * FROM agent_messages WHERE sessionId = 42
     |   3. Return session with messages
     |
     |-- [Check Quota]
     |   GET /api/module-configs/resolve?moduleName=agent-core&key=DEFAULT_MAX_TOKENS&tenantId=T
     |   module-subscriptions: checkQuota(userId, 'agent-tokens', estimatedTokens)
     |   Result: { allowed: true, remaining: 45000 }
     |
     |-- [Select Strategy]
     |   agent.workflowAgentId = null, sessionId present --> MultiTurnStrategy
     |
     |-- [Build Graph]
     |   createAgentGraph(effectiveLlmConfig, tools, sessionHistory)
     |   GraphBuilder constructs default ReAct loop:
     |     prompt -> llm -> (tools -> llm)* -> END
     |
     |-- [Execute]
     |   graph.invoke(initialState)
     |   LangGraph runtime processes nodes:
     |     prompt: inject system prompt + history + new message
     |     llm: call module-ai generateText/streamText
     |       -> LLM returns tool_calls? -> tools node
     |       -> LLM returns content? -> done
     |     tools: execute each tool call via ToolWrapper
     |       -> return results to state
     |       -> loop back to llm node
     |
     |-- [Record Execution]
     |   ExecutionTracker.record({
     |     agentId: 7, sessionId: 42, status: 'completed',
     |     tokenUsage: { input: 1200, output: 350, total: 1550 },
     |     toolsUsed: ['kb.searchEntries'],
     |     latencyMs: 2340
     |   })
     |
     |-- [Stream Response]
     |   StreamingAdapter formats SSE events
     |   Each token, tool call, and completion event sent to client

  4. HTTP Response
     Content-Type: text/event-stream

     event: token
     data: {"content": "Our"}

     event: token
     data: {"content": " office"}

     event: token
     data: {"content": " hours"}

     ...

     event: done
     data: {"tokenUsage": {"input": 1200, "output": 350}, "latencyMs": 2340}
```

---

## Tool Wrapper Discovery Flow

```
  Startup / Refresh Event
       |
       v
  ToolWrapper.refreshCatalog()
       |
       |-- registry.getAll()
       |   Returns: [moduleA, moduleB, moduleC, ...]
       |
       |-- For each module:
       |   |
       |   |-- Has chat.actionSchemas?
       |   |   YES: Parse each schema into ToolDefinition
       |   |         { name: schema.name,
       |   |           description: schema.description,
       |   |           parameters: schema.parameters,
       |   |           endpoint: schema.endpoint,
       |   |           permissions: schema.requiredPermissions }
       |   |
       |   |-- Has apiHandlers?
       |   |   YES: For endpoints NOT already covered by actionSchemas:
       |   |         Auto-generate ToolDefinition
       |   |         { name: '{module}.{resource}.{method}',
       |   |           description: auto-generated from route pattern,
       |   |           parameters: inferred from handler input,
       |   |           endpoint: { method, path } }
       |   |
       |   +-- Merge into ToolRegistry (actionSchemas take priority)
       |
       |-- Update toolCatalog Map
       |-- Update lastRefreshAt
       |
       v
  ToolRegistry ready (N tools from M modules)
```

---

## LangGraph Integration Model

Agent Core maps OVEN concepts to LangGraph primitives:

| OVEN Concept | LangGraph Primitive |
|-------------|-------------------|
| Agent definition | Graph configuration |
| Node definition | Node function |
| Edge (always) | Edge |
| Conditional transition | Conditional edge |
| Session + messages | State (messages channel) |
| Checkpoint | PostgreSQL checkpointer |
| Execution | Graph invocation |
| Tool binding | Tool node with filtered tools |

### Default Graph Topology (ReAct Loop)

When an agent has no `workflowAgentId`, the system generates a default ReAct (Reasoning + Acting) loop:

```
  START
    |
    v
  [prompt]  -- inject system prompt, history, user message
    |
    v
  [llm]  -- call language model
    |
    |-- has tool_calls? --YES--> [tools] -- execute calls
    |                                |
    |                                +-----> back to [llm]
    |
    +-- no tool_calls (final answer) --> END
```

This is the most common agent pattern: the LLM reasons about the user's question, optionally calls tools to gather information, and produces a final response.

### Custom Graph Topology (Workflow-Backed)

When an agent has a `workflowAgentId`, the `WorkflowStrategy` delegates to `module-workflow-agents`, which provides arbitrary graph topologies with:

- Multiple LLM nodes with different configurations.
- Parallel tool execution branches.
- Human-in-the-loop approval gates.
- Memory read/write nodes.
- Complex conditional routing.

---

## Error Handling

```
  Error at any point in the invocation flow:
       |
       |-- Node execution error?
       |   ErrorDecorator catches it:
       |   - Record error in execution metadata
       |   - Emit error SSE event
       |   - Decide: retry (transient) or fail (permanent)
       |
       |-- Tool execution error?
       |   ToolWrapper catches it:
       |   - Return error result to LLM (as tool result with error flag)
       |   - LLM can decide to retry, use different tool, or respond without tool
       |
       |-- Quota exceeded?
       |   QuotaDecorator catches it:
       |   - Return 429 with quota information
       |   - Do not execute, do not charge
       |
       |-- Timeout exceeded?
       |   TimeoutDecorator catches it:
       |   - Cancel execution
       |   - Record partial results
       |   - Mark execution as 'failed' with timeout error
       |
       |-- Agent not found / disabled?
       |   AgentInvoker catches it:
       |   - Return 404 (not found) or 403 (disabled)
       |
       |-- All errors:
       |   ExecutionTracker records:
       |   - status: 'failed'
       |   - error: error message
       |   - partial tokenUsage (if any tokens were consumed)
       |   - latencyMs (time until failure)
       |
       |   EventBus emits:
       |   - agents.execution.failed { id, agentId, sessionId, error }
```

---

## Configuration Resolution

Agent Core reads the following configuration keys from the 5-tier cascade (`module-config`):

| Key | Type | Default | Scope | Purpose |
|-----|------|---------|-------|---------|
| `MAX_TOOL_BINDINGS_PER_AGENT` | number | 50 | instance | Cap on tools per agent |
| `DEFAULT_MAX_TOKENS` | number | 4096 | instance | Default maxTokens for responses |
| `EXECUTION_TIMEOUT_MS` | number | 120000 | global | Maximum execution duration |
| `TOOL_WRAPPER_REFRESH_INTERVAL` | number | 60 | global | Seconds between catalog refreshes |

Resolution happens at invocation time:

```typescript
const maxTokens = await resolveConfig('agent-core', 'DEFAULT_MAX_TOKENS', tenantId);
const timeout = await resolveConfig('agent-core', 'EXECUTION_TIMEOUT_MS');
```

Tenant-scoped keys (instanceScoped: true) allow per-tenant overrides. For example, a premium tenant could have `DEFAULT_MAX_TOKENS = 8192` while the platform default remains `4096`.
