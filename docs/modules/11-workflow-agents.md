# Module: Workflow Agents

> **Package**: `packages/module-workflow-agents/`
> **Name**: `@oven/module-workflow-agents`
> **Dependencies**: `module-registry`, `module-workflows`, `module-agent-core`, `module-ai`
> **Status**: Planned

---

## 1. Overview

Workflow Agents is a **specialized workflow engine for AI agent orchestration**. It inherits the graph-based execution model from the existing `module-workflows` (state machine with nodes, edges, guards, and context accumulation) and extends it with agent-specific capabilities: LLM reasoning nodes, tool-calling loops, memory access, human-in-the-loop interrupts, and automatic MCP server generation.

The key insight is that an AI agent's reasoning process can be modeled as a workflow — a graph of steps where each step reads from shared state, performs an action (call an LLM, invoke a tool, evaluate a condition), writes results back to state, and transitions to the next step. By building on the existing workflow engine, Workflow Agents inherits all its strengths (persistence, per-node tracking, visual editing, versioning) while adding the patterns that make agent orchestration possible.

### Design Goals

- **Inherit, don't duplicate** — Reuse the workflow engine's execution loop, state management, context accumulation, and persistence model. Extend it with new node types, not a new engine
- **Graph-based agent flows** — Define agent reasoning as a directed graph where each node is a reusable step (LLM call, tool execution, condition check, human review). This follows LangGraph's StateGraph pattern adapted to OVEN conventions
- **Composable and reusable** — Agent workflows can be embedded as subgraphs within other workflows, and vice versa. A workflow step can invoke an agent, and an agent step can trigger a workflow
- **Automatic MCP exposure** — When an agent workflow is registered and enabled, the system can automatically generate an MCP (Model Context Protocol) server definition on top of its registered nodes and agents, making them available as tools to external AI systems
- **Tool-calling loop** — A built-in pattern where the LLM node proposes tool calls, the tool executor node runs them, and control loops back to the LLM with the results — repeating until the LLM produces a final response (the ReAct pattern)
- **Checkpointing and resumption** — Long-running agent workflows checkpoint their state at each node, enabling resumption after failures, timeouts, or human-in-the-loop pauses

---

## 2. Core Concepts

### Relationship to module-workflows

The existing `module-workflows` provides:
- A **WorkflowDefinition** format (XState-inspired JSON with states, transitions, guards, invokes)
- A **WorkflowEngine** that iterates through states, executing node invocations and recording per-node execution history
- A **Node Registry** with core nodes (condition, transform, delay, emit, setVariable, sql, resolveConfig, forEach, whileLoop) and dynamic API nodes auto-discovered from module handlers
- **Execution persistence** in `workflow_executions` and `node_executions` tables
- **Version history** in `workflow_versions`
- **Context accumulation** where each node's output merges into a shared context using `$.path` expressions

Workflow Agents **extends** this foundation by:
1. Adding new agent-specific node types to the Node Registry
2. Introducing a specialized execution mode that supports streaming, checkpointing, and tool-calling loops
3. Providing a dedicated graph definition format optimized for agent flows (while remaining compatible with the base workflow definition format)
4. Auto-generating MCP server definitions from registered agent workflows

### Agent-Specific Node Types

These new node types are registered in the existing workflow Node Registry under the `agent` category, making them available in both the workflow editor and the agent workflow editor:

**`agent.llm`** — Language Model Invocation
- Sends the current conversation state (messages array) to a configured LLM
- Reads LLM configuration from the agent definition or from node-level overrides
- **Resolves the actual model through `module-ai`'s provider registry** — the node configuration references a model alias or `providerId:modelId` string, and Module AI resolves it to the concrete AI SDK provider instance at runtime
- Uses the AI SDK's `generateText()` or `streamText()` (via `module-ai`) under the hood, inheriting middleware (usage tracking, rate limiting, guardrails)
- Outputs either a text response or a set of tool call requests
- Supports streaming: tokens are emitted as they arrive, while the full response is recorded on completion
- Supports the AI SDK's `prepareStep` pattern for per-step model switching and tool filtering
- Supports `stopWhen` conditions from the AI SDK (`stepCountIs`, `hasToolCall`, custom predicates) in addition to the workflow's `maxToolIterations` safety limit

**`agent.toolExecutor`** — Tool Call Executor
- Receives tool call requests from the LLM node
- Resolves each tool to its target: **module API endpoints** via the Tool Wrapper (from `module-agent-core`) or **AI service tools** via `module-ai`'s tool catalog (e.g., `ai.generateImage`, `ai.embed`, `ai.rag.retrieve`)
- AI tools are defined with Zod `inputSchema`/`outputSchema` following the AI SDK `tool()` pattern — the executor validates inputs against these schemas before invocation
- Executes tool calls in parallel or sequentially (configurable)
- Records each tool invocation and its result
- Outputs tool results back to the conversation state

**`agent.toolLoop`** — ReAct-Style Tool-Calling Loop
- A composite node that encapsulates the LLM → tool executor → LLM cycle
- Repeats until the LLM produces a final text response without tool calls, or until a maximum iteration limit is reached
- This is the most common pattern for agent reasoning and is provided as a single reusable node for convenience

**`agent.memory.read`** — Long-Term Memory Retrieval
- Queries the agent's memory store for relevant context based on the current conversation
- **Uses `module-ai`'s embedding and vector store tools** (`ai.embed` + `ai.vectorStore.query`) to perform semantic retrieval from the configured vector database
- Returns matching memory entries that are injected into the conversation state as additional context

**`agent.memory.write`** — Long-Term Memory Storage
- Extracts key information from the current conversation turn and persists it to the agent's memory store
- **Uses `module-ai`'s embedding tools** (`ai.embed` + `ai.vectorStore.upsert`) to vectorize and store memories for later semantic retrieval
- Enables the agent to recall facts, preferences, and prior interactions across sessions

**`agent.rag`** — Retrieval-Augmented Generation Step
- A composite node that combines retrieval and generation in one step
- **Uses `module-ai`'s RAG tools** (`ai.rag.retrieve` or `ai.rag.ask`) to search a configured vector store, retrieve relevant context, and optionally generate an answer in one pass
- Configurable: vector store slug, retrieval top-K, reranking, and filter criteria
- Output is injected into the conversation state as context for subsequent LLM nodes

**`agent.imageGen`** — Image Generation Step
- Generates images using `module-ai`'s `ai.generateImage` tool
- Configurable: model (DALL-E 3, Imagen, Flux, SDXL), size, aspect ratio, style, quality
- Output is stored as a URL or base64 reference in the workflow context

**`agent.embed`** — Embedding Step
- Embeds text content using `module-ai`'s `ai.embed` or `ai.embedMany` tools
- Used for preprocessing content before vector store ingestion, or for computing similarity in conditional branches

**`agent.humanReview`** — Human-in-the-Loop Checkpoint
- Pauses the workflow execution and emits an interrupt event
- Presents the current state (proposed action, reasoning, relevant context) to a human reviewer via the dashboard or an external notification
- Waits for a human decision: approve (continue as-is), edit (modify the proposed action), or reject (abort or provide feedback)
- On approval or edit, resumes execution from the checkpoint with the human's input incorporated into state
- On rejection, transitions to an error or fallback state

**`agent.subagent`** — Invoke Another Agent
- Invokes a different agent (by slug) as a subgraph within the current workflow
- Passes selected context from the parent workflow as messages to the sub-agent
- Receives the sub-agent's response and merges it back into the parent context
- Enables hierarchical multi-agent patterns: a coordinator agent can delegate to specialist agents

**`agent.prompt`** — Dynamic Prompt Assembly
- Builds a system prompt dynamically from templates and current state
- Supports template variables resolved from the workflow context via `$.path` expressions
- Useful for agents that need to adjust their instructions based on the current step or available data

### Agent Workflow Definition

An agent workflow definition extends the base `WorkflowDefinition` format with agent-specific metadata:

- **agentConfig** — Default LLM configuration for all LLM nodes in this workflow (can be overridden per-node)
- **memoryConfig** — How memory is managed for this workflow (enabled/disabled, memory scope, retrieval strategy)
- **mcpExport** — Whether this workflow should be automatically exposed as an MCP server (see Section 6)
- **maxToolIterations** — Global safety limit for tool-calling loops (default: 10)
- **streamingEnabled** — Whether this workflow supports streaming responses

The workflow's states, transitions, guards, and invoke definitions follow the exact same format as `module-workflows`. The only difference is that invoke nodes can reference the new agent-specific node types (`agent.llm`, `agent.toolExecutor`, etc.) in addition to all existing core and API nodes.

### State and Context Model

Agent workflows use the same context accumulation model as regular workflows, extended with conversation-specific state:

- **messages** — The conversation message history (array of role/content objects), automatically maintained and passed to LLM nodes
- **toolCalls** — Pending tool call requests from the last LLM response
- **toolResults** — Results from the last tool execution batch
- **All standard workflow context** — Accumulated node outputs accessible via `$.path` expressions

Each node reads from this shared state, performs its action, and writes results back — the same pattern as the existing workflow engine.

---

## 3. Database Schema

### Tables

**`agent_workflows`** — Agent-specific workflow definitions
- `id` (serial, PK)
- `name` (varchar) — human-readable name
- `slug` (varchar, unique) — URL-safe identifier
- `description` (text)
- `definition` (JSONB) — the full workflow graph definition (extended WorkflowDefinition format)
- `agentConfig` (JSONB) — default LLM config for this workflow
- `memoryConfig` (JSONB) — memory settings (enabled, scope, retrieval strategy)
- `mcpExport` (boolean, default false) — whether to auto-generate an MCP server
- `enabled` (boolean, default true)
- `version` (integer, default 1)
- `createdAt`, `updatedAt` (timestamps)

**`agent_workflow_versions`** — Version history
- `id` (serial, PK)
- `agentWorkflowId` (integer, FK -> agent_workflows)
- `version` (integer)
- `definition` (JSONB) — full snapshot
- `description` (text, nullable)
- `createdAt` (timestamp)

**`agent_workflow_executions`** — Execution records (extends the concept from workflow_executions)
- `id` (serial, PK)
- `agentWorkflowId` (integer, FK -> agent_workflows)
- `agentId` (integer, nullable) — the agent that triggered this execution
- `sessionId` (integer, nullable) — the agent session this execution belongs to
- `status` (varchar) — running, paused (human-in-the-loop), completed, failed
- `currentState` (varchar) — current position in the graph
- `context` (JSONB) — accumulated context snapshot
- `checkpoint` (JSONB, nullable) — checkpoint data for resumption after pause
- `triggerEvent` (varchar, nullable) — event that triggered this execution
- `tokenUsage` (JSONB) — aggregate token usage across all LLM nodes
- `startedAt`, `completedAt` (timestamps)
- `error` (text, nullable)

**`agent_workflow_node_executions`** — Per-node execution records
- `id` (serial, PK)
- `executionId` (integer, FK -> agent_workflow_executions)
- `nodeId` (varchar) — state name in the graph
- `nodeType` (varchar) — agent.llm, agent.toolExecutor, core.condition, etc.
- `status` (varchar) — running, completed, failed, paused
- `input` (JSONB) — resolved input parameters
- `output` (JSONB) — node output
- `tokenUsage` (JSONB, nullable) — for LLM nodes: input/output/total tokens
- `toolCalls` (JSONB, nullable) — for tool executor nodes: array of tool invocations
- `error` (text, nullable)
- `durationMs` (integer, nullable)
- `startedAt`, `completedAt` (timestamps)

**`agent_memory`** — Long-term memory store for agents
- `id` (serial, PK)
- `agentId` (integer) — which agent this memory belongs to
- `userId` (integer, nullable) — optionally scoped to a specific user
- `key` (varchar) — memory key/topic
- `content` (text) — the stored information
- `metadata` (JSONB) — source session, timestamp, relevance score
- `createdAt`, `updatedAt` (timestamps)

**`mcp_server_definitions`** — Auto-generated MCP server configurations
- `id` (serial, PK)
- `agentWorkflowId` (integer, FK -> agent_workflows)
- `name` (varchar) — MCP server name
- `slug` (varchar, unique) — URL-safe identifier
- `toolDefinitions` (JSONB) — array of MCP tool definitions generated from the workflow's nodes and available tools
- `status` (varchar) — active, disabled
- `lastGeneratedAt` (timestamp) — when the MCP definition was last rebuilt
- `createdAt`, `updatedAt` (timestamps)

---

## 4. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/agent-workflows` | List all agent workflow definitions |
| POST | `/api/agent-workflows` | Create a new agent workflow |
| GET | `/api/agent-workflows/[id]` | Get a specific agent workflow |
| PUT | `/api/agent-workflows/[id]` | Update an agent workflow (auto-versions) |
| DELETE | `/api/agent-workflows/[id]` | Delete an agent workflow |
| GET | `/api/agent-workflows/[id]/versions` | List version history |
| POST | `/api/agent-workflows/[id]/versions/[versionId]/restore` | Restore a previous version |
| POST | `/api/agent-workflows/[id]/execute` | Manually trigger execution |
| GET | `/api/agent-workflow-executions` | List executions |
| GET | `/api/agent-workflow-executions/[id]` | Get execution details with node history |
| POST | `/api/agent-workflow-executions/[id]/resume` | Resume a paused execution (human-in-the-loop) |
| POST | `/api/agent-workflow-executions/[id]/cancel` | Cancel a running execution |
| GET | `/api/agent-workflow-executions/[id]/nodes` | List node executions for an execution |
| GET | `/api/agent-memory` | List memory entries (filterable by agentId, userId) |
| POST | `/api/agent-memory` | Create a memory entry |
| DELETE | `/api/agent-memory/[id]` | Delete a memory entry |
| GET | `/api/mcp-servers` | List auto-generated MCP server definitions |
| GET | `/api/mcp-servers/[id]` | Get a specific MCP server definition |
| POST | `/api/mcp-servers/[id]/regenerate` | Regenerate the MCP definition from current workflow state |

---

## 5. Execution Engine Behavior

### Standard Flow (Tool-Calling Agent)

The most common agent workflow pattern follows the ReAct cycle:

```
Start
  ↓
[agent.prompt] — Assemble system prompt from template + context
  ↓
[agent.memory.read] — Retrieve relevant long-term memories
  ↓
[agent.toolLoop] — ReAct cycle:
  │  ├─ [agent.llm] — Send messages + tools to LLM
  │  ├─ If tool calls → [agent.toolExecutor] — Execute tools
  │  └─ Loop back to [agent.llm] with tool results
  │  └─ If final response → exit loop
  ↓
[agent.memory.write] — Store key information from this turn
  ↓
End — Return final response
```

### Human-in-the-Loop Flow

When a workflow contains `agent.humanReview` nodes:

1. Execution reaches the human review node
2. The execution status changes to `paused`
3. A checkpoint is saved with the full context snapshot
4. An event `agents-workflow.execution.paused` is emitted
5. The dashboard (or an external system listening for the event) presents the review request to a human
6. The human submits a decision via `POST /api/agent-workflow-executions/[id]/resume` with action (approve/edit/reject) and optional modified data
7. The engine reloads the checkpoint, incorporates the human's input, and continues execution from the review node

### Subgraph Invocation

When an `agent.subagent` node invokes another agent:

1. The parent workflow pauses at the subagent node
2. The target agent is invoked via `module-agent-core`'s invoke mechanism
3. The sub-agent runs its own workflow (or single-step execution) independently
4. On completion, the sub-agent's response is returned to the parent workflow's context
5. The parent workflow continues from the subagent node with the response merged into state

### Checkpointing

- Every node completion creates a checkpoint in the execution record's `context` field
- If the server restarts or the execution times out, it can be resumed from the last checkpoint
- The `agent_workflow_node_executions` table provides a complete audit trail of every step

---

## 6. MCP Server Auto-Generation

When an agent workflow has `mcpExport: true`, the system automatically generates an MCP server definition that exposes the workflow's capabilities as tools to external AI systems.

### How It Works

1. The system reads the agent workflow's definition and extracts all unique node types, tool bindings, and the overall workflow purpose
2. For each capability, it generates an MCP tool definition including: name, description, input parameters (JSON Schema), and expected output format
3. The generated MCP definition is stored in `mcp_server_definitions` and can be served as an MCP endpoint
4. When the workflow definition changes, the MCP definition is regenerated to stay in sync

### What Gets Exposed

- The workflow itself as a top-level tool ("invoke this agent workflow with these inputs")
- Individual tool-bound module endpoints that the workflow uses (re-exported as MCP tools with their original parameter schemas)
- Any sub-agents referenced by the workflow

### Use Case

An external AI system (e.g., Claude Desktop, another OVEN agent, a third-party orchestrator) can connect to the auto-generated MCP server and discover/invoke the agent workflow's capabilities as if they were native tools. This enables:
- Cross-platform agent interoperability
- Hierarchical orchestration where external systems delegate to OVEN agents
- Exposing OVEN's module capabilities to any MCP-compatible client

---

## 7. Dashboard UI

### Resources (React Admin CRUD)
- **Agent Workflows** — List, create, edit, show views for agent workflow definitions
- **Agent Workflow Executions** — List and show views with node-by-node execution timeline
- **Agent Memory** — List and manage memory entries across agents
- **MCP Servers** — List and inspect auto-generated MCP definitions

### Visual Editor Integration

The agent workflow editor extends the existing workflow visual editor (from `packages/workflow-editor/`) with:
- Agent-specific node palette entries (LLM, tool executor, tool loop, memory, human review, subagent, prompt)
- A conversation preview panel showing how messages flow through the graph
- Tool binding configuration per node
- LLM parameter configuration per LLM node
- Human-in-the-loop configuration per review node

### Menu Section
```
──── Agent Workflows ────
Agent Workflows
Executions
Memory
MCP Servers
```

---

## 8. Events

| Event | Payload |
|-------|---------|
| `agents-workflow.workflow.created` | id, name, slug |
| `agents-workflow.workflow.updated` | id, name, slug, version |
| `agents-workflow.workflow.deleted` | id, slug |
| `agents-workflow.execution.started` | id, agentWorkflowId, agentId |
| `agents-workflow.execution.completed` | id, agentWorkflowId, status, tokenUsage |
| `agents-workflow.execution.failed` | id, agentWorkflowId, error |
| `agents-workflow.execution.paused` | id, agentWorkflowId, nodeId, reason |
| `agents-workflow.execution.resumed` | id, agentWorkflowId, decision |
| `agents-workflow.node.started` | executionId, nodeId, nodeType |
| `agents-workflow.node.completed` | executionId, nodeId, nodeType, durationMs |
| `agents-workflow.node.failed` | executionId, nodeId, nodeType, error |
| `agents-workflow.memory.created` | id, agentId, key |
| `agents-workflow.memory.deleted` | id, agentId |
| `agents-workflow.mcp.generated` | mcpServerId, agentWorkflowId |

---

## 9. Integration Points

| Module | Integration |
|--------|-------------|
| **module-workflows** | Inherits the execution engine model, node registry, context accumulation, and `$.path` expression resolution. Agent-specific nodes are registered alongside existing core and API nodes. |
| **module-agent-core** | Provides agent definitions, Tool Wrapper for module endpoint discovery, session/message management, and the invoke mechanism used by `agent.subagent` nodes. |
| **module-ai** | Provides all AI service tools that agent workflows consume: LLM generation (via provider registry), embeddings, image/video generation, vector store operations, and RAG. The `agent.llm` node resolves models through Module AI's provider registry. The `agent.memory.*` nodes use Module AI's embedding and vector store tools. The `agent.rag`, `agent.imageGen`, and `agent.embed` nodes are thin wrappers around Module AI tools. All AI calls inherit Module AI's middleware (usage tracking, rate limits, guardrails). |
| **module-registry** | Discovers all module API endpoints for tool binding. Reads module metadata for enriched tool descriptions. |
| **module-roles** | Enforces permissions on tool invocations. Human-in-the-loop decisions can be routed based on user roles. |
| **module-chat** | Chat can invoke agent workflows as its reasoning backend. A Chat session can be backed by an agent workflow for complex multi-step interactions. |
| **All other modules** | Any module's API endpoints are available as tools within agent workflows through the inherited Tool Wrapper. Module AI's tools (`ai.*`) are available alongside module API tools. |

---

## 10. Non-Functional Requirements

- **Streaming** — LLM nodes support token-level streaming; the execution engine forwards streaming events to the client via SSE when invoked through the agent endpoint
- **Checkpointing** — Every node completion checkpoints state to enable resumption after failures or pauses
- **Timeout safety** — Agent workflow executions respect a configurable maximum duration; individual LLM calls have their own timeout limits
- **Iteration limits** — Tool-calling loops have a configurable maximum iteration count (default: 10) to prevent infinite loops
- **Parallel execution** — Tool executor nodes can invoke multiple tools in parallel when the LLM requests multiple tool calls in a single response
- **Observability** — Every execution is tracked at the workflow level and the per-node level, with token usage, latency, and error information
- **Backward compatibility** — Agent workflows are stored in the same format family as regular workflows; the base workflow engine can inspect (though not execute agent-specific nodes in) agent workflow definitions
