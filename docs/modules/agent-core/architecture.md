# Module Agent Core -- Architecture

> Patterns, component interactions, and data flow diagrams for the agent management and execution layer.

---

## Design Patterns

Agent Core combines eight well-established patterns to deliver a flexible, observable, and extensible agent execution system.

---

### 1. Builder Pattern -- GraphBuilder

The `GraphBuilder` provides a fluent API for constructing LangGraph `StateGraph` instances from agent configuration. It shields callers from the underlying LangGraph wiring details and enforces structural invariants (entry point required, no orphan nodes, conditional edges must cover all branches).

```
GraphBuilder('dental-faq')
  |
  |-- .addNode('prompt', PromptNode)
  |-- .addNode('llm', LLMNode)
  |-- .addNode('tools', ToolExecutorNode)
  |-- .addEdge('prompt', 'llm')
  |-- .addConditionalEdge('llm', routeByToolCalls, { tools: 'tools', end: END })
  |-- .addEdge('tools', 'llm')
  |-- .setEntryPoint('prompt')
  |-- .compile()
  |
  v
  CompiledStateGraph (executable)
```

**Key responsibilities:**

- Validate graph topology before compilation (no cycles without conditional exits, all nodes reachable from entry point).
- Inject lifecycle decorators (logging, timing, error handling) around each node.
- Attach PostgreSQL checkpointer for state persistence across invocations.
- Return a compiled, ready-to-invoke `StateGraph` instance.

**Why Builder over direct construction:** Agent definitions are stored as JSONB. The builder translates declarative config into an imperative graph construction sequence, handling node instantiation, edge wiring, and decorator attachment in a single chain.

---

### 2. Registry Pattern -- ToolRegistry

The `ToolRegistry` (internal to the Tool Wrapper) maintains a cached catalog of all available tools discovered from the Module Registry. It is populated at startup and refreshed on a configurable interval.

```
                    registry.getAll()
                          |
                          v
  +-----------------------------------------------+
  |              Module Registry                    |
  |  module-ai     module-kb     module-maps  ...  |
  |  chat: {       chat: {      apiHandlers: {     |
  |    actionSchemas  actionSchemas  ...           |
  |  }             }                               |
  +-----------------------------------------------+
                          |
                          v
  +-----------------------------------------------+
  |              ToolRegistry (cached)              |
  |                                                 |
  |  ai.generateText     -> { schema, endpoint }   |
  |  ai.embed            -> { schema, endpoint }   |
  |  kb.searchEntries    -> { schema, endpoint }   |
  |  kb.getEntry         -> { schema, endpoint }   |
  |  maps.getChunk       -> { schema, endpoint }   |
  |  ...                                            |
  +-----------------------------------------------+
                          |
                          | filter by agent.toolBindings
                          v
                  Tools passed to LLM
```

**Refresh strategy:** The registry is refreshed every `TOOL_WRAPPER_REFRESH_INTERVAL` seconds (default 60). A forced refresh occurs when a module registration event is received via the EventBus (`registry.module.registered`).

**Naming convention:** Tool names follow `{module}.{resource}.{action}` format (e.g., `kb.searchEntries`, `ai.generateText`), matching the existing workflow node naming convention established by `module-workflows`.

---

### 3. Decorator Pattern -- Node Lifecycle Decorators

Every node in an agent graph is wrapped with lifecycle decorators that add cross-cutting concerns without modifying node logic.

```
                 +---------------------------+
                 |     ExecutionDecorator     |  <-- records start/end time, status
                 |  +---------------------+  |
                 |  |   LoggingDecorator   |  |  <-- logs input/output, node ID
                 |  |  +---------------+  |  |
                 |  |  | QuotaDecorator|  |  |  <-- checks token budget before LLM nodes
                 |  |  |  +---------+  |  |  |
                 |  |  |  |  Node   |  |  |  |  <-- actual node.execute()
                 |  |  |  +---------+  |  |  |
                 |  |  +---------------+  |  |
                 |  +---------------------+  |
                 +---------------------------+
```

The decorator stack is applied by the `GraphBuilder` during `.compile()`. Decorators are composable -- additional decorators can be registered via the `NodeRegistry` for custom concerns (rate limiting, caching, circuit breaking).

**Decorator responsibilities:**

| Decorator | Applies To | Purpose |
|-----------|-----------|---------|
| `ExecutionDecorator` | All nodes | Records timing, status, error state per node |
| `LoggingDecorator` | All nodes | Emits structured logs with node ID, input/output summaries |
| `QuotaDecorator` | LLM nodes | Pre-flight token quota check via `module-subscriptions` |
| `ErrorDecorator` | All nodes | Catches exceptions, records error, decides retry vs fail |
| `TimeoutDecorator` | All nodes | Enforces `EXECUTION_TIMEOUT_MS` per node |

---

### 4. Observer Pattern -- Execution Event Stream

Agent execution emits a stream of events for real-time monitoring via Server-Sent Events (SSE). Observers can subscribe to the stream for live updates during invocation.

```
  AgentInvoker.invoke()
       |
       |  emits events during execution
       |
       v
  EventEmitter (per-invocation)
       |
       +---> SSE StreamingAdapter  ---->  HTTP Response (text/event-stream)
       |
       +---> ExecutionTracker      ---->  agent_executions table
       |
       +---> EventBus             ---->  agents.execution.completed (platform-wide)
```

**Event types emitted during streaming:**

| Event | Data | When |
|-------|------|------|
| `token` | `{ content: string }` | Each token generated by the LLM |
| `tool_call_start` | `{ toolName, args }` | LLM decides to call a tool |
| `tool_call_end` | `{ toolName, result, latencyMs }` | Tool execution completes |
| `node_start` | `{ nodeId, input }` | Graph node begins execution |
| `node_end` | `{ nodeId, output, latencyMs }` | Graph node completes |
| `error` | `{ message, nodeId? }` | Error during execution |
| `done` | `{ tokenUsage, latencyMs, toolsUsed }` | Execution complete |

---

### 5. Factory Pattern -- createAgentGraph

The `createAgentGraph` factory function is the primary entry point for converting an agent definition (database record) into an executable `StateGraph`.

```
  Agent Definition (JSONB from DB)
       |
       v
  createAgentGraph(agentConfig, tools, sessionHistory)
       |
       |-- 1. Resolve node types from NodeRegistry
       |-- 2. Instantiate nodes with config
       |-- 3. Build graph via GraphBuilder
       |-- 4. Attach decorators
       |-- 5. Configure checkpointer
       |-- 6. Compile
       |
       v
  CompiledStateGraph (ready to invoke)
```

**Why a factory instead of new GraphBuilder() everywhere:** The factory encapsulates the translation from JSONB agent definitions to GraphBuilder API calls. It handles:

- Default graph topology for agents without explicit graph config (single LLM node with tool loop).
- Custom graph topology for agents linked to a `workflowAgentId`.
- Session history injection into initial state.
- Tool filtering and binding.

---

### 6. Strategy Pattern -- Execution Strategy

The `AgentInvoker` selects an execution strategy based on the agent's configuration:

```
  AgentInvoker.invoke(agent, request)
       |
       |-- agent.workflowAgentId?
       |       |
       |       +-- YES --> WorkflowStrategy
       |       |           (delegates to module-workflow-agents engine)
       |       |
       |       +-- NO  --> request.messages.length === 1 && !request.sessionId?
       |                       |
       |                       +-- YES --> SingleTurnStrategy
       |                       |           (one LLM call, no session persistence)
       |                       |
       |                       +-- NO  --> MultiTurnStrategy
       |                                   (build graph, manage session, loop)
```

| Strategy | When Used | Behavior |
|----------|-----------|----------|
| `SingleTurnStrategy` | One message, no session, no workflow | Direct LLM call with tools. Minimal overhead. |
| `MultiTurnStrategy` | Multi-message or session continuation | Full graph execution with state persistence. |
| `WorkflowStrategy` | Agent has `workflowAgentId` | Delegates to `module-workflow-agents` engine. |

The strategy pattern ensures that simple agents (FAQ bots, single-shot classifiers) execute with minimal overhead, while complex agents (multi-step reasoning, human-in-the-loop) get full graph execution.

---

### 7. Mediator Pattern -- AgentInvoker

The `AgentInvoker` is the central orchestrator that coordinates all components during an invocation. No component communicates directly with another -- they all go through the invoker.

```
  POST /agents/[slug]/invoke
       |
       v
  +---------------------------------------------------+
  |                   AgentInvoker                      |
  |                                                     |
  |  1. Load agent definition (DB)                     |
  |  2. Validate & merge exposed params                |
  |  3. Resolve tools (ToolWrapper)                    |
  |  4. Load/create session (SessionManager)           |
  |  5. Check quota (module-subscriptions)             |
  |  6. Select execution strategy                      |
  |  7. Build graph (createAgentGraph factory)         |
  |  8. Execute graph (LangGraph runtime)              |
  |  9. Record execution (ExecutionTracker)            |
  | 10. Stream/return response (StreamingAdapter)      |
  +---------------------------------------------------+
       |              |              |              |
       v              v              v              v
   ToolWrapper  SessionManager  ExecutionTracker  StreamingAdapter
```

**Why a mediator:** The invocation flow involves 7+ components that must coordinate in a specific sequence. Without a mediator, components would need to know about each other, creating tight coupling. The invoker owns the sequence and passes only the data each component needs.

---

### 8. Template Method -- Node Lifecycle

Every agent node implements the `AgentNode` interface, which defines a fixed lifecycle with optional hooks:

```
  Node Lifecycle:

  1. init(config)        [optional]  -- One-time setup (load resources, warm caches)
       |
       v
  2. validate(input)     [optional]  -- Check input before execution
       |
       |-- ValidationResult.ok?
       |       |
       |       +-- NO  --> Skip execution, return validation error
       |       |
       |       +-- YES -->
       v
  3. execute(state, input)  [required]  -- Core logic
       |
       v
  4. cleanup()           [optional]  -- Release resources, flush buffers
```

```typescript
interface AgentNode<TInput, TOutput> {
  readonly id: string;
  readonly category: NodeCategory;
  init?(config: NodeConfig): Promise<void>;
  validate?(input: TInput): ValidationResult;
  execute(state: AgentState, input: TInput): Promise<TOutput>;
  cleanup?(): Promise<void>;
  getSchema(): { input: ZodSchema; output: ZodSchema };
  getDescription(): string;
}
```

**Template method guarantees:**

- `init` is called once when the graph is compiled, not per-invocation.
- `validate` runs before every `execute` call. If validation fails, the node is skipped and the validation error is recorded in the execution log.
- `execute` receives the current graph state and the node's typed input. It returns a typed output that the graph merges into state.
- `cleanup` is called when the graph is disposed (end of invocation or on error).

---

## Invocation Flow (End-to-End)

```
  Client                    API Route               AgentInvoker
    |                          |                          |
    |  POST /agents/faq/invoke |                          |
    |  { messages, params,     |                          |
    |    sessionId, stream }   |                          |
    |------------------------->|                          |
    |                          |  loadAgent('faq')        |
    |                          |------------------------->|
    |                          |                          |  DB: SELECT * FROM agents
    |                          |                          |       WHERE slug = 'faq'
    |                          |                          |
    |                          |  mergeParams(agent,req)  |
    |                          |------------------------->|
    |                          |                          |  Validate exposedParams
    |                          |                          |  Merge overrides into llmConfig
    |                          |                          |
    |                          |  resolveTools(agent)     |
    |                          |------------------------->|
    |                          |                          |  ToolWrapper.getTools()
    |                          |                          |  Filter by toolBindings
    |                          |                          |
    |                          |  loadSession(sessionId)  |
    |                          |------------------------->|
    |                          |                          |  SessionManager.getOrCreate()
    |                          |                          |  Load message history
    |                          |                          |
    |                          |  checkQuota(agent,user)  |
    |                          |------------------------->|
    |                          |                          |  module-subscriptions
    |                          |                          |  Pre-flight token check
    |                          |                          |
    |                          |  execute(graph, state)   |
    |                          |------------------------->|
    |                          |                          |  LangGraph: run StateGraph
    |                          |                          |
    |                          |      [LLM Loop]         |
    |                          |                          |  Node: prompt -> llm
    |  <-- SSE: token ---------|<-- stream tokens --------|  LLM generates tokens
    |  <-- SSE: tool_call -----|<-- tool call event ------|  LLM requests tool
    |                          |                          |  Node: tools (execute HTTP call)
    |  <-- SSE: tool_result ---|<-- tool result event ----|  Tool returns result
    |                          |                          |  Node: llm (continue with result)
    |  <-- SSE: token ---------|<-- stream tokens --------|  LLM generates final answer
    |  <-- SSE: done ----------|<-- completion event -----|
    |                          |                          |
    |                          |  recordExecution()       |
    |                          |------------------------->|
    |                          |                          |  INSERT agent_executions
    |                          |                          |  INSERT agent_messages
    |                          |                          |  UPDATE agent_sessions
    |                          |                          |  EventBus: agents.execution.completed
```

---

## Tool Wrapper Discovery Flow

```
  On startup / refresh interval:

  ToolWrapper
       |
       |  registry.getAll()
       v
  +-------------------------------------------+
  | Module Registry                            |
  |                                            |
  | module-ai:                                 |
  |   chat.actionSchemas: [                    |
  |     { name: 'ai.generateText', ... },      |
  |     { name: 'ai.embed', ... },             |
  |   ]                                        |
  |                                            |
  | module-kb:                                 |
  |   chat.actionSchemas: [                    |
  |     { name: 'kb.searchEntries', ... },     |
  |     { name: 'kb.getEntry', ... },          |
  |   ]                                        |
  |   apiHandlers: {                           |
  |     'knowledge-base': GET/POST,            |
  |     'knowledge-base/[id]': GET/PUT/DELETE, |
  |   }                                        |
  |                                            |
  | module-maps:                               |
  |   apiHandlers: {                           |
  |     'maps': GET/POST,                      |
  |     'maps/[id]': GET/PUT/DELETE,           |
  |   }                                        |
  +-------------------------------------------+
       |
       |  For each module:
       |    1. Read chat.actionSchemas (rich descriptions)
       |    2. Read apiHandlers (auto-generate for endpoints without schemas)
       |    3. Deduplicate (actionSchemas take priority)
       |    4. Build ToolDefinition { name, description, parameters, endpoint }
       |
       v
  +-------------------------------------------+
  | ToolRegistry (cached)                      |
  |                                            |
  | 47 tools discovered across 12 modules      |
  |                                            |
  | ai.generateText                            |
  | ai.embed                                   |
  | ai.generateImage                           |
  | kb.searchEntries                           |
  | kb.getEntry                                |
  | maps.getMap                                |
  | maps.getChunk                              |
  | sessions.create                            |
  | players.getPlayer                          |
  | ...                                        |
  +-------------------------------------------+
```

---

## Graph Builder Pipeline

```
  Agent Definition (from DB)
       |
       v
  +---------------------------------+
  | createAgentGraph()              |
  |                                 |
  | 1. Parse llmConfig              |
  |    - Resolve model alias        |
  |    - Apply param overrides      |
  |                                 |
  | 2. Parse toolBindings           |
  |    - Filter ToolRegistry        |
  |    - Build tool definitions     |
  |                                 |
  | 3. Parse systemPrompt           |
  |    - Substitute variables       |
  |    - Apply tenant config        |
  |                                 |
  | 4. Determine graph topology     |
  |    - workflowAgentId? -> load   |
  |    - else -> default ReAct loop |
  +---------------------------------+
       |
       v
  +---------------------------------+
  | GraphBuilder (fluent API)       |
  |                                 |
  | .addNode('prompt', PromptNode)  |
  | .addNode('llm', LLMNode)       |
  | .addNode('tools', ToolNode)     |
  | .addEdge('prompt', 'llm')      |
  | .addConditionalEdge(...)        |
  | .addEdge('tools', 'llm')       |
  | .setEntryPoint('prompt')       |
  +---------------------------------+
       |
       v
  +---------------------------------+
  | Validation                      |
  |                                 |
  | - Entry point defined?          |
  | - All nodes reachable?          |
  | - Conditional edges exhaustive? |
  | - No infinite loops without     |
  |   conditional exit?             |
  +---------------------------------+
       |
       v
  +---------------------------------+
  | Decoration                      |
  |                                 |
  | - Wrap each node with:          |
  |   ExecutionDecorator            |
  |   LoggingDecorator              |
  |   QuotaDecorator (LLM nodes)   |
  |   TimeoutDecorator              |
  +---------------------------------+
       |
       v
  +---------------------------------+
  | Compilation                     |
  |                                 |
  | - LangGraph StateGraph.compile()|
  | - Attach PostgreSQL checkpointer|
  | - Return executable graph       |
  +---------------------------------+
       |
       v
  CompiledStateGraph
```

---

## State Shape

The `AgentState` object flows through the graph, accumulating data as nodes execute:

```typescript
interface AgentState {
  // Message history (conversation context)
  messages: AgentMessage[];

  // Current tool definitions available to the LLM
  tools: ToolDefinition[];

  // Pending tool calls from the last LLM response
  pendingToolCalls: ToolCall[];

  // Results from the most recent tool executions
  toolResults: ToolCallResult[];

  // Accumulated metadata (tokens, timing, tools used)
  executionMetadata: {
    totalTokens: { input: number; output: number };
    toolsUsed: string[];
    nodeTimings: Record<string, number>;
  };

  // Session context (persisted across invocations)
  sessionContext: Record<string, unknown>;

  // Terminal flag -- set when the graph should stop
  done: boolean;
}
```

---

## Checkpointing

LangGraph's PostgreSQL checkpointer persists graph state between invocations, enabling:

- **Session continuity** -- Resume a multi-turn conversation with full state.
- **Human-in-the-loop** -- Pause execution, persist state, resume after human approval.
- **Error recovery** -- If execution fails mid-graph, the last checkpoint can be restored.

The checkpointer uses the `agent_sessions` table's `context` JSONB column to store serialized graph state. Each checkpoint is keyed by `(sessionId, nodeId, stepIndex)`.
