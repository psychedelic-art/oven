# Detailed Requirements — Workflow Agents, MCP Server & Python Sidecar

> Functional requirements with acceptance criteria for all three packages.

---

## FR-WA-001: Agent Workflow CRUD

**Description**: Create, read, update, and delete agent workflow definitions. Each workflow stores a graph definition (JSONB), agent configuration, memory configuration, and an MCP export flag.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | POST `/api/agent-workflows` creates a workflow with name, slug, description, definition, agentConfig, memoryConfig, mcpExport, enabled fields | API test: 201 response with all fields persisted |
| 2 | Slug must be unique across all agent workflows | API test: 409 on duplicate slug |
| 3 | GET `/api/agent-workflows` returns paginated list with Content-Range header | API test: correct range header, filter by tenantId and enabled |
| 4 | PUT `/api/agent-workflows/:id` auto-creates a version snapshot when definition changes | API test: version incremented, old definition preserved in agent_workflow_versions |
| 5 | DELETE `/api/agent-workflows/:id` removes the workflow and cascades to versions, executions | API test: 204, related records removed |
| 6 | Workflows with `tenantId = null` are platform-wide (accessible to all tenants) | API test: list endpoint returns platform-wide workflows regardless of tenant filter |
| 7 | When `mcpExport` is toggled to true, MCP definitions are auto-generated | Integration test: mcp_server_definitions record created |

---

## FR-WA-002: Agent Node Execution

**Description**: Execute all 13 agent node types within the workflow engine's execution loop.

**Acceptance Criteria**:

| # | Node Type | Criterion |
|---|-----------|-----------|
| 1 | `agent.llm` | Sends messages + tools to configured LLM via module-ai. Records tokenUsage (input, output, total) and costCents. Supports streaming when enabled. |
| 2 | `agent.toolExecutor` | Resolves tool calls from LLM response. Executes each tool via Tool Wrapper or AI tool catalog. Supports parallel and sequential execution modes. Records each tool invocation in toolCalls JSONB. |
| 3 | `agent.toolLoop` | Implements ReAct cycle: LLM -> tools -> LLM until final text response or max iterations reached. Respects MAX_TOOL_ITERATIONS config. |
| 4 | `agent.memory.read` | Generates query embedding via module-ai. Performs vector similarity search on agent_memory. Returns top-K results filtered by agentId (and optional userId). |
| 5 | `agent.memory.write` | Extracts key information from current context. Generates embedding via module-ai. Inserts into agent_memory with metadata (sourceSessionId, relevanceScore). |
| 6 | `agent.rag` | Searches configured vector store, retrieves context, injects into conversation state. Configurable: vector store slug, top-K, reranking, filter criteria. |
| 7 | `agent.humanReview` | Pauses execution. Saves checkpoint. Sets status to 'paused'. Emits execution.paused event. Waits for resume API call. |
| 8 | `agent.subagent` | Invokes another agent by slug as a subgraph. Passes selected context as messages. Receives response and merges into parent context. |
| 9 | `agent.prompt` | Assembles system prompt from template. Resolves `$.path` expressions from current context. Outputs assembled prompt string. |
| 10 | `agent.imageGen` | Generates images via module-ai's ai.generateImage tool. Configurable model, size, style. Stores result URL/base64 in context. |
| 11 | `agent.embed` | Embeds text via module-ai's ai.embed tool. Returns embedding vector. Useful for preprocessing or similarity comparison. |
| 12 | `core.checkQuota` | Calls module-subscriptions checkQuota API. Returns { allowed, remaining, limit, used }. Used in guards: `$.checkQuota_output.allowed == true`. |
| 13 | `core.trackUsage` | Calls module-subscriptions trackUsage API. Records metered usage for a service. Returns { recorded, remaining, exceeded }. |

**Verification**: Unit test per node type covering init, validate, execute, error handling.

---

## FR-WA-003: ReAct Tool Loop

**Description**: The `agent.toolLoop` node implements the ReAct reasoning cycle where an LLM proposes tool calls, tools are executed, and results are fed back to the LLM until a final response is produced.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Loop continues until LLM produces a text response without tool calls | Integration test: multi-turn tool loop terminates correctly |
| 2 | Loop aborts after MAX_TOOL_ITERATIONS iterations with an error | Config test: set limit to 3, force 4+ tool calls, verify abort |
| 3 | Each iteration creates a node execution record | DB test: N iterations produce N node execution records |
| 4 | Tool results are appended to the messages array between iterations | State test: messages grow with tool call/result pairs |
| 5 | Parallel tool execution is supported when LLM requests multiple tools | Performance test: 3 tool calls execute concurrently |
| 6 | Per-iteration token usage is tracked and aggregated | Cost test: total tokenUsage is sum of all LLM calls in loop |
| 7 | If a tool call fails, the error is included in messages and the loop continues | Error test: failed tool result has error field, LLM sees it |

---

## FR-WA-004: Human-in-the-Loop

**Description**: The `agent.humanReview` node pauses execution for human approval. The execution can be resumed via API with an approve, edit, or reject decision.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Reaching a humanReview node sets execution status to 'paused' | DB test: status column updated |
| 2 | A checkpoint containing full context, messages, and current position is saved | DB test: checkpoint JSONB is non-null and complete |
| 3 | Event `agents-workflow.execution.paused` is emitted with nodeId and reason | Event test: EventBus receives correct payload |
| 4 | POST `/api/agent-workflow-executions/:id/resume` with action='approve' continues from checkpoint | Integration test: execution proceeds to next node |
| 5 | Resume with action='edit' merges modified data into context before continuing | Integration test: context contains edited values |
| 6 | Resume with action='reject' transitions to error/fallback state | Integration test: execution status becomes 'failed' or transitions to configured fallback |
| 7 | Only users with `agent-workflow-executions.resume` permission can resume | Auth test: 403 for unauthorized users |
| 8 | Resuming a non-paused execution returns 400 | API test: bad request response |

---

## FR-WA-005: Checkpointing

**Description**: Every node completion saves a checkpoint to enable resume after failure, timeout, or pause.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | After each node completes, the execution's context and currentState are updated | DB test: checkpoint data matches post-node state |
| 2 | If the server restarts mid-execution, the execution can be resumed from the last checkpoint | Integration test: kill process, restart, verify resume |
| 3 | Concurrent checkpoint writes are safe (optimistic locking) | Concurrency test: two simultaneous saves, last-writer-wins with version check |
| 4 | Checkpoint data includes: currentState, context, messages, pending toolCalls | Schema test: all fields present in JSONB |
| 5 | Checkpoint is only enabled when CHECKPOINT_ENABLED config is true | Config test: disable checkpointing, verify no context updates during execution |
| 6 | Completed executions clear their checkpoint data | DB test: checkpoint is null after status='completed' |

---

## FR-WA-006: Agent Memory

**Description**: Agents have long-term memory that persists across sessions. Memory entries are stored with optional vector embeddings for semantic retrieval.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | POST `/api/agent-memory` creates a memory entry with agentId, key, content | API test: 201 response with all fields |
| 2 | GET `/api/agent-memory?agentId=X` lists memory entries filtered by agent | API test: only returns entries for specified agent |
| 3 | agent.memory.write node generates an embedding and stores it in the embedding column | DB test: embedding vector is populated, 1536 dimensions |
| 4 | agent.memory.read node performs semantic search using cosine similarity | Query test: returns entries ordered by relevance |
| 5 | Memory is scoped by agentId and optionally userId | Isolation test: agent A cannot read agent B's memory |
| 6 | MEMORY_RETRIEVAL_TOP_K config controls how many results are returned | Config test: set to 3, verify exactly 3 results |
| 7 | DELETE `/api/agent-memory/:id` removes a memory entry and its embedding | API test: 204, entry no longer in DB |

---

## FR-WA-007: Subagent Invocation

**Description**: The `agent.subagent` node invokes another agent workflow as a subgraph within the current execution.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Subagent is resolved by slug from agent_workflows table | Lookup test: correct workflow loaded |
| 2 | Selected context from parent is passed as input to subagent | State test: subagent receives specified context fields |
| 3 | Subagent executes independently with its own node execution records | DB test: separate node execution records for subagent |
| 4 | Subagent response is merged back into parent context at the configured output path | State test: parent context contains subagent result |
| 5 | Recursive subagent invocation is limited (max depth) | Safety test: depth > 5 aborts with error |
| 6 | Subagent failures are surfaced as errors in the parent node execution | Error test: parent node shows subagent error |

---

## FR-WA-008: MCP Auto-Generation

**Description**: When a workflow has `mcpExport = true`, the system auto-generates MCP server definitions from the workflow's tool bindings and capabilities.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Creating a workflow with mcpExport=true generates an mcp_server_definitions record | DB test: record exists with toolDefinitions JSONB |
| 2 | The workflow itself is exposed as a top-level MCP tool | Schema test: tool with workflow slug exists in definitions |
| 3 | All bound module tools are re-exported as MCP tools with original schemas | Schema test: tool count matches bound tools |
| 4 | Referenced subagents are exposed as MCP tools | Schema test: subagent tools present |
| 5 | Updating a workflow regenerates MCP definitions (when MCP_AUTO_REGENERATE=true) | Event test: agents-workflow.mcp.generated emitted on update |
| 6 | POST `/api/mcp-servers/:id/regenerate` manually triggers regeneration | API test: lastGeneratedAt updated |
| 7 | Disabling a workflow sets its MCP server status to 'disabled' | DB test: status column updated |

---

## FR-WA-009: Execution Cost Tracking

**Description**: Every execution tracks cost across all nodes. Per-node tokenUsage and costCents are recorded. Execution-level aggregates are computed. A configurable cost cap prevents runaway costs.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | Each LLM node records tokenUsage { input, output, total } in its node execution | DB test: tokenUsage JSONB populated |
| 2 | Each LLM node records costCents computed from token count and model pricing | DB test: costCents is positive integer |
| 3 | Execution-level totalCostCents is the sum of all node costCents | Aggregation test: totalCostCents = sum of node costs |
| 4 | When totalCostCents exceeds EXECUTION_COST_CAP_CENTS, the execution is aborted | Safety test: execution status='failed' with cost cap error |
| 5 | Cost cap is checked after each node completion, not just LLM nodes | Test: non-LLM node that triggers an AI call also counts |
| 6 | Execution detail endpoint returns both aggregate and per-node cost breakdown | API test: response includes tokenUsage and totalCostCents |

---

## FR-WA-010: Quota Nodes

**Description**: `core.checkQuota` and `core.trackUsage` are workflow-level nodes for quota management, enabling agents to branch on quota status.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | core.checkQuota calls module-subscriptions checkQuota API and returns { allowed, remaining, limit, used } | Node test: correct shape returned |
| 2 | core.checkQuota output can be used in guards: `$.checkQuota_output.allowed == true` | Guard test: conditional branching works |
| 3 | core.trackUsage calls module-subscriptions trackUsage API with serviceSlug and amount | Node test: usage recorded in sub_usage_records |
| 4 | core.trackUsage returns { recorded, remaining, exceeded } | Node test: correct shape returned |
| 5 | Both nodes work with the standard `$.path` expression system | Context test: outputs accessible via `$.path` |

---

## FR-WA-011: Version History

**Description**: Agent workflow definitions are automatically versioned on every update.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | PUT to agent-workflows/:id increments the version field | DB test: version goes from N to N+1 |
| 2 | A snapshot of the old definition is saved to agent_workflow_versions | DB test: version record contains previous definition |
| 3 | GET `/api/agent-workflows/:id/versions` returns version history | API test: list of versions with timestamps |
| 4 | POST `/api/agent-workflows/:id/versions/:versionId/restore` restores a previous version | API test: definition matches restored version |
| 5 | Restoring a version creates a new version record (does not delete history) | DB test: total version count increases by 1 |

---

## FR-WA-012: MCP Server

**Description**: The `mcp-server` package auto-discovers all module actionSchemas and serves them as MCP tools via stdio (local) or HTTP (Vercel) transport.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | `tools/list` returns one MCP tool per module actionSchema | Protocol test: tool count matches total actionSchemas |
| 2 | `tools/call` routes to the correct module API endpoint and returns the result | Protocol test: call kb.searchEntries, verify response |
| 3 | Tool inputSchema is a valid JSON Schema derived from actionSchema.parameters | Schema test: JSON Schema validates sample inputs |
| 4 | `resources/list` returns one resource per registered module | Protocol test: resource count matches module count |
| 5 | `resources/read` returns module metadata as JSON | Protocol test: valid JSON with module description |
| 6 | `prompts/list` returns agent system prompts | Protocol test: prompts listed for agents with system prompts |
| 7 | `prompts/get` returns a parameterized prompt with arguments resolved | Protocol test: prompt template variables replaced |
| 8 | Permission checking prevents unauthorized tool calls | Auth test: tool call without permission returns error |
| 9 | Rate limiting prevents excessive tool calls | Rate test: exceed limit, verify 429-equivalent error |
| 10 | stdio transport works for local development | E2E test: connect via stdio, list tools, call tool |
| 11 | HTTP transport works for Vercel serverless | E2E test: HTTP request/response cycle |

---

## FR-WA-013: Python Runtime

**Description**: The Python sidecar compiles JavaScript workflow definitions to Python LangGraph StateGraphs and executes them with LangSmith tracing.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | POST `/execute` accepts a workflow definition and returns the execution result | API test: valid JSON response with result |
| 2 | JSON definition is compiled to a LangGraph StateGraph with correct nodes and edges | Compiler test: graph structure matches definition |
| 3 | All node types in the Python registry mirror the JavaScript implementations | Registry test: all 13 node types registered |
| 4 | LangSmith tracing is active when LANGSMITH_API_KEY env var is set | Tracing test: traces appear in LangSmith |
| 5 | LangSmith tracing is silently disabled when env var is not set | Startup test: no errors without LANGSMITH_API_KEY |
| 6 | AsyncPostgresSaver persists checkpoints to PostgreSQL | Checkpoint test: checkpoint data in DB after node completion |
| 7 | OvenClient authenticates with API key on every request | Client test: Authorization header present |
| 8 | OvenClient retries failed requests with exponential backoff | Client test: transient failures retried, permanent failures propagated |
| 9 | GET `/health` returns 200 with runtime version and node count | Health test: correct response shape |
| 10 | GET `/nodes` lists all registered Python node types | API test: all 13 types listed |
| 11 | POST `/stream` returns SSE events for token-by-token streaming | Stream test: SSE events received in order |

---

## FR-WA-014: Streaming

**Description**: LLM nodes support token-level streaming. The execution engine forwards streaming events to the client via SSE when invoked through the execution API.

**Acceptance Criteria**:

| # | Criterion | Verification |
|---|-----------|-------------|
| 1 | When streamingEnabled is true, agent.llm nodes use streamText instead of generateText | Execution test: streaming events emitted |
| 2 | Tokens are forwarded to the client as SSE data events | SSE test: each token arrives as a separate event |
| 3 | The complete response is still recorded in the node execution output | DB test: output contains full text after stream completes |
| 4 | Token usage is tracked even in streaming mode | Cost test: tokenUsage populated after stream completes |
| 5 | Non-LLM nodes do not produce streaming events | SSE test: only LLM nodes emit token events |
| 6 | Streaming works through the Python sidecar's /stream endpoint | E2E test: SSE events received from Python runtime |
