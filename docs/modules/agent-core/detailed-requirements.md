# Module Agent Core -- Detailed Requirements

> Functional requirements for the agent management and execution layer.

---

## FR-AC-001: Agent CRUD

**Priority:** P0 (Core)
**Dependencies:** module-registry (schema composition), module-roles (permissions)

### Description

The system must support full lifecycle management of agent definitions through standard CRUD operations. Each agent is a persistent configuration record that defines how a particular AI agent behaves.

### Acceptance Criteria

1. **Create**: `POST /api/agents` creates a new agent with all required fields. The system auto-generates a slug from the name if not provided. The initial version is set to 1.

2. **Read**: `GET /api/agents` returns a paginated list with Content-Range header. Supports filtering by `tenantId`, `enabled`, and full-text search on `name`/`description`. `GET /api/agents/[id]` returns the full agent definition.

3. **Update**: `PUT /api/agents/[id]` updates the agent definition. If any field in `llmConfig`, `systemPrompt`, `toolBindings`, or `exposedParams` changes, the system auto-increments the `version` field and creates a snapshot in `agent_versions`.

4. **Delete**: `DELETE /api/agents/[id]` soft-disables or hard-deletes the agent. Associated sessions are archived, not deleted.

5. **Validation**:
   - `name` is required, max 255 characters.
   - `slug` is unique, max 128 characters, URL-safe (lowercase alphanumeric + hyphens).
   - `llmConfig.provider` must be a registered provider in `module-ai`.
   - `llmConfig.model` must be a valid model alias or identifier.
   - `toolBindings` entries must reference tools that exist in the ToolRegistry.
   - `exposedParams` entries must be valid LLM config field names.

### Data Model

```typescript
{
  name: string;                    // "Dental FAQ Assistant"
  slug: string;                    // "dental-faq"
  description?: string;            // "Answers patient questions..."
  tenantId?: number;               // null = platform-wide agent
  llmConfig: {
    provider: string;              // "openai"
    model: string;                 // "fast" (alias) or "gpt-4o-mini"
    temperature: number;           // 0.0 - 2.0
    maxTokens: number;             // 1 - 128000
    topP?: number;                 // 0.0 - 1.0
    frequencyPenalty?: number;     // -2.0 - 2.0
    presencePenalty?: number;      // -2.0 - 2.0
    stopSequences?: string[];
  };
  systemPrompt: string;            // Supports {{variable}} substitution
  exposedParams: string[];         // ["temperature", "maxTokens"]
  toolBindings: string[];          // ["kb.searchEntries", "ai.embed"]
  inputConfig: {
    modalities: ('text' | 'image' | 'audio')[];
    maxImageSize?: number;         // bytes
    maxAudioDuration?: number;     // seconds
  };
  workflowAgentId?: number;        // FK to workflow-agent graph
  metadata?: Record<string, unknown>;
  enabled: boolean;
  version: number;
}
```

---

## FR-AC-002: Tool Wrapper (Automatic Module API Discovery)

**Priority:** P0 (Core)
**Dependencies:** module-registry (getAll, chat.actionSchemas), module-roles (permission check)

### Description

The Tool Wrapper automatically discovers all registered module API endpoints and converts them into tool definitions that can be provided to language models for function calling. This eliminates the need for manual tool registration when new modules or endpoints are added.

### Acceptance Criteria

1. **Discovery**: On startup and at configurable intervals (`TOOL_WRAPPER_REFRESH_INTERVAL`), the Tool Wrapper queries `registry.getAll()` and builds a complete tool catalog.

2. **Rich descriptions**: For modules with `chat.actionSchemas`, the Tool Wrapper uses the schema's `name`, `description`, `parameters`, and `requiredPermissions` to build tool definitions.

3. **Auto-generation**: For API endpoints without explicit `actionSchemas`, the Tool Wrapper auto-generates tool definitions from the route pattern and HTTP method. Auto-generated descriptions follow the pattern: `"{method} {resource} - Auto-discovered from {module}"`.

4. **Naming convention**: Tool names follow `{module}.{resource}.{action}` format (e.g., `kb.searchEntries`, `maps.getMap`).

5. **Deduplication**: When a module provides both `actionSchemas` and `apiHandlers` for the same endpoint, the `actionSchema` takes priority.

6. **Filtering**: When resolving tools for an agent, only tools listed in the agent's `toolBindings` are included. An empty `toolBindings` array means no tools available.

7. **Permission-aware execution**: When executing a tool call, the Tool Wrapper checks that the invoking user has the required permission (from `requiredPermissions` or `api_endpoint_permissions`). If the user lacks permission, the tool call returns an error result to the LLM (not an HTTP 403 to the client).

8. **Tool catalog endpoint**: `GET /api/agents/tools` returns the full discovered tool catalog for dashboard display.

9. **Event-driven refresh**: The Tool Wrapper refreshes immediately when it receives a `registry.module.registered` event via the EventBus.

### Tool Definition Format

```typescript
interface ToolDefinition {
  name: string;                    // "kb.searchEntries"
  description: string;             // "Search the knowledge base for FAQ entries"
  parameters: Record<string, {     // JSON Schema for function parameters
    type: string;
    description?: string;
    required?: boolean;
    enum?: string[];
  }>;
  endpoint: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;                  // "knowledge-base/[tenantSlug]/search"
  };
  requiredPermissions: string[];   // ["knowledge-base.read"]
  source: 'actionSchema' | 'auto-discovered';
  moduleName: string;              // "knowledge-base"
}
```

---

## FR-AC-003: Agent Invocation

**Priority:** P0 (Core)
**Dependencies:** FR-AC-001, FR-AC-002, module-ai (LLM calls)

### Description

The system provides a unified endpoint for invoking any registered agent. The endpoint handles parameter merging, session management, tool resolution, execution, and response delivery.

### Acceptance Criteria

1. **Endpoint**: `POST /api/agents/[slug]/invoke` accepts invocation requests.

2. **Request format**:
   ```typescript
   {
     messages: MessagePart[][];     // Required: at least one message
     params?: Record<string, any>; // Optional: exposed param overrides
     sessionId?: number;           // Optional: continue existing session
     stream?: boolean;             // Optional: SSE streaming (default false)
   }
   ```

3. **Agent resolution**: The agent is loaded by slug. If not found or disabled, return 404.

4. **Parameter merging**: Only parameters listed in `agent.exposedParams` are accepted from `request.params`. All other keys are silently ignored. Merged config = `{ ...agent.llmConfig, ...allowedOverrides }`.

5. **Session handling**:
   - If `sessionId` is provided, load the existing session and its message history. The session must belong to the authenticated user (or the user must be admin).
   - If `sessionId` is not provided, create a new session.

6. **Execution**: The AgentInvoker selects the appropriate strategy and executes the agent graph. The LLM may perform zero or more tool calls before producing a final response.

7. **Response (non-streaming)**: Return JSON with the assistant's response message, execution metadata (tokens, latency, tools used), and the sessionId.

8. **Response (streaming)**: Return SSE stream with token events, tool call events, and a completion event.

9. **Recording**: Every invocation creates an `agent_executions` record with full metadata regardless of success or failure.

10. **Idempotency**: If the request includes a `requestId` header, duplicate requests return the cached response instead of re-executing.

### Response Format (Non-Streaming)

```typescript
{
  message: {
    role: 'assistant';
    content: MessagePart[];
    toolCalls?: ToolCall[];
  };
  sessionId: number;
  execution: {
    id: number;
    tokenUsage: { input: number; output: number; total: number };
    latencyMs: number;
    toolsUsed: string[];
    status: 'completed' | 'failed';
  };
}
```

---

## FR-AC-004: Streaming Response

**Priority:** P0 (Core)
**Dependencies:** FR-AC-003

### Description

The invocation endpoint supports Server-Sent Events (SSE) for real-time, token-by-token streaming of agent responses.

### Acceptance Criteria

1. **Activation**: When `stream: true` is passed in the invocation request, the response is delivered as SSE (`Content-Type: text/event-stream`).

2. **Token events**: Each token generated by the LLM is sent as an SSE event with type `token` and data `{ content: string }`.

3. **Tool call events**: When the LLM decides to call a tool, an event with type `tool_call_start` is sent with `{ toolName, args }`. When the tool completes, `tool_call_end` is sent with `{ toolName, result, latencyMs }`.

4. **Node lifecycle events**: When a graph node starts/ends, `node_start`/`node_end` events are sent with `{ nodeId, latencyMs }`.

5. **Error events**: If an error occurs mid-stream, an `error` event is sent with `{ message, nodeId? }`. The stream is then closed.

6. **Completion event**: When the agent finishes, a `done` event is sent with aggregated metadata `{ tokenUsage, latencyMs, toolsUsed, sessionId }`. The stream is then closed.

7. **Backpressure**: The streaming adapter respects HTTP backpressure. If the client is slow to consume, the adapter buffers up to a configurable limit before pausing LLM generation.

8. **Connection handling**: If the client disconnects mid-stream, the execution continues to completion (for logging purposes) but no more events are sent.

---

## FR-AC-005: LangGraph Integration

**Priority:** P0 (Core)
**Dependencies:** LangGraph JS library, module-ai

### Description

Agent definitions compile into LangGraph JS `StateGraph` instances for execution. The integration supports the full LangGraph feature set including conditional edges, checkpointing, and state channels.

### Acceptance Criteria

1. **Graph compilation**: The `GraphBuilder` produces a valid LangGraph `StateGraph` from agent configuration.

2. **Default topology**: Agents without a `workflowAgentId` compile to the default ReAct loop: `prompt -> llm -> (conditional: tools -> llm | END)`.

3. **Custom topology**: Agents with a `workflowAgentId` delegate to `module-workflow-agents` for graph construction.

4. **State management**: The `AgentState` object flows through the graph with typed channels for messages, tools, tool calls, tool results, and execution metadata.

5. **Checkpointing**: PostgreSQL checkpointer persists graph state between invocations, enabling multi-turn conversations and human-in-the-loop patterns.

6. **Node lifecycle**: All nodes implement the `AgentNode` interface with `init`, `validate`, `execute`, and `cleanup` hooks.

7. **Conditional routing**: The `routeByToolCalls` function inspects the LLM response and routes to the `tools` node if tool calls are present, or to `END` if the response is a final answer.

8. **Cycle limit**: Graph execution has a configurable maximum iteration count (default 10) to prevent infinite loops. If exceeded, execution fails with a `max_iterations_exceeded` error.

---

## FR-AC-006: Node Library

**Priority:** P1 (Important)
**Dependencies:** FR-AC-005, module-ai

### Description

Agent Core provides a library of six built-in node types that serve as building blocks for agent graphs. Custom node types can be registered by other modules.

### Acceptance Criteria

1. **LLM Node**: Invokes a language model via `module-ai`. Accepts configuration for model, temperature, maxTokens, system prompt override. Input: messages array. Output: assistant message (possibly with tool calls).

2. **Tool Executor Node**: Receives pending tool calls from the LLM node, executes each via the Tool Wrapper, and returns tool results. Supports parallel tool execution when multiple tools are called simultaneously.

3. **Condition Node**: Evaluates a JavaScript expression or function against the current state and returns a branch key. Used with conditional edges to route flow.

4. **Transform Node**: Applies a transformation to the state data. Supports mapping, filtering, and enrichment operations. Input/output schemas are declared per-instance.

5. **Human Review Node**: Pauses graph execution by persisting state via the checkpointer and emitting a `human_review_requested` event. Execution resumes when a human approves or rejects via the session API.

6. **Memory Node**: Reads from or writes to a long-term memory store associated with the agent or user. Enables cross-session context recall (e.g., remembering patient preferences).

7. **Registration**: Built-in nodes are seeded in `agent_node_definitions` with `isSystem: true`. The NodeRegistry loads them at startup.

8. **Custom nodes**: `module-workflow-agents` and other modules can register additional node types via `NodeRegistry.register(slug, NodeClass)`.

9. **Schema exposure**: Each node type exposes input/output/config schemas via `getSchema()` for the dashboard UI to render configuration forms.

---

## FR-AC-007: Session Management

**Priority:** P0 (Core)
**Dependencies:** FR-AC-001

### Description

Agent conversations are persisted as sessions containing ordered message sequences. Sessions enable multi-turn conversations with context accumulation.

### Acceptance Criteria

1. **Create session**: `POST /api/agent-sessions` creates a new session linked to an agent and user. Auto-generates a title from the first user message (truncated to 100 chars).

2. **Resume session**: When `sessionId` is provided in an invoke request, the full message history is loaded and prepended to the new messages.

3. **Message storage**: Each message stores `role` (user, assistant, system, tool), `content` (parts-based JSONB), `toolCalls`, `toolResults`, and `metadata`.

4. **Context accumulation**: The session's `context` JSONB field stores accumulated context (referenced entities, state checkpoints, user preferences) that persists across invocations.

5. **Session status**: Sessions are `active` or `archived`. Archived sessions are read-only. `DELETE /api/agent-sessions/[id]` sets status to `archived`.

6. **Playground isolation**: Sessions created from the playground are flagged with `isPlayground: true` and can be filtered from production session lists.

7. **User isolation**: Users can only access their own sessions unless they have admin permissions (`agent-sessions.read` with admin scope).

8. **Message listing**: `GET /api/agent-sessions/[id]/messages` returns paginated messages in chronological order.

9. **Direct message send**: `POST /api/agent-sessions/[id]/messages` sends a message to the agent within an existing session, triggering execution and appending the response.

---

## FR-AC-008: Execution Logging

**Priority:** P0 (Core)
**Dependencies:** FR-AC-003

### Description

Every agent invocation is recorded in the `agent_executions` table with comprehensive metadata for monitoring, debugging, and cost tracking.

### Acceptance Criteria

1. **Creation**: An execution record is created at the start of every invocation with status `running`.

2. **Completion**: On successful completion, the record is updated with:
   - `status`: `completed`
   - `tokenUsage`: `{ input, output, total }`
   - `latencyMs`: total execution time in milliseconds
   - `toolsUsed`: array of tool names invoked during execution
   - `completedAt`: timestamp

3. **Failure**: On error, the record is updated with:
   - `status`: `failed`
   - `error`: error message (sanitized, no stack traces in production)
   - `tokenUsage`: partial usage if any tokens were consumed before failure
   - `latencyMs`: time until failure
   - `completedAt`: timestamp

4. **Effective config**: The `llmConfig` JSONB field stores the effective configuration used (after parameter merges), enabling reproduction of the exact execution conditions.

5. **Listing**: `GET /api/agent-executions` returns paginated executions. Supports filtering by `agentId`, `sessionId`, `status`, and date range.

6. **Detail**: `GET /api/agent-executions/[id]` returns the full execution record including effective config, tools used, and linked message.

7. **Aggregation**: The execution data supports dashboard statistics:
   - Average tokens per invocation (by agent)
   - Average latency per invocation (by agent)
   - Error rate (by agent, by time period)
   - Tool usage frequency
   - Total token consumption (by tenant, by time period)

8. **Event emission**: On completion, emit `agents.execution.completed` with `{ id, agentId, sessionId, status, tokenUsage, latencyMs }`. On failure, emit `agents.execution.failed` with `{ id, agentId, sessionId, error }`.

---

## FR-AC-009: Multimodal Input

**Priority:** P1 (Important)
**Dependencies:** FR-AC-003, module-ai (vision models)

### Description

The agent invocation endpoint accepts multimodal messages containing text, images, and audio content parts. The agent can process these if the underlying LLM supports the relevant capabilities.

### Acceptance Criteria

1. **Parts-based messages**: Each message's `content` is an array of typed parts:
   ```typescript
   type MessagePart =
     | { type: 'text'; text: string }
     | { type: 'image'; imageUrl?: string; imageBase64?: string; mimeType: string }
     | { type: 'audio'; audioBase64: string; mimeType: string };
   ```

2. **Image support**: Images can be provided as URLs or base64-encoded data. The system validates MIME type (jpeg, png, gif, webp) and enforces `inputConfig.maxImageSize`.

3. **Audio support**: Audio is provided as base64-encoded data. The system validates MIME type (wav, mp3, ogg, webm) and enforces `inputConfig.maxAudioDuration`.

4. **Modality validation**: The agent's `inputConfig.modalities` declares which types are accepted. If a message contains a modality not in the list, the invocation returns a 400 error.

5. **Passthrough**: Multimodal parts are passed directly to the LLM via `module-ai`. The LLM provider determines actual processing capability (e.g., GPT-4o supports images, Whisper handles audio).

---

## FR-AC-010: Version History

**Priority:** P1 (Important)
**Dependencies:** FR-AC-001

### Description

Agent definitions are automatically versioned on every change. Previous versions can be viewed and restored.

### Acceptance Criteria

1. **Auto-versioning**: When a PUT request changes any field in `llmConfig`, `systemPrompt`, `toolBindings`, `exposedParams`, or `inputConfig`, the system:
   - Snapshots the current definition into `agent_versions` before applying the update.
   - Increments the `version` field on the main record.

2. **Version listing**: `GET /api/agents/[id]/versions` returns paginated version history, newest first.

3. **Version detail**: Each version record contains:
   - `version`: integer version number.
   - `definition`: full JSONB snapshot of the agent configuration at that version.
   - `description`: optional changelog note (from the PUT request body).
   - `createdAt`: timestamp.

4. **Version restore**: `POST /api/agents/[id]/versions/[versionId]/restore` replaces the current agent definition with the snapshot from the specified version. This creates a new version snapshot (the one being replaced) and increments the version number.

5. **Non-versioned fields**: Changes to `name`, `description`, `metadata`, and `enabled` do not trigger version creation (they are identity/status fields, not behavioral).

---

## FR-AC-011: Quota Integration

**Priority:** P1 (Important)
**Dependencies:** module-subscriptions (UsageMeteringService)

### Description

Agent execution integrates with the platform's quota system to prevent overconsumption and track usage against subscription plans.

### Acceptance Criteria

1. **Pre-flight check**: Before executing an agent, the invoker checks the user's (or tenant's) remaining token quota via `module-subscriptions`. If the quota would be exceeded by the estimated token usage (based on `maxTokens`), the invocation returns a 429 response with quota information.

2. **Post-execution tracking**: After execution, the actual token usage is reported to `module-subscriptions` for metering against the plan quota.

3. **Agent-level limits**: Individual agents can have a per-invocation token cap configured via the `llmConfig.maxTokens` field. This is enforced regardless of the user's overall quota.

4. **Tenant-level limits**: Per-tenant token budgets can be configured via `module-config` (`DEFAULT_MAX_TOKENS` with tenant scope).

5. **Graceful degradation**: If `module-subscriptions` is not registered, quota checks are skipped (the dependency is optional at runtime).

---

## FR-AC-012: Exposed Parameters

**Priority:** P1 (Important)
**Dependencies:** FR-AC-001, FR-AC-003

### Description

Each agent declares which LLM configuration parameters can be overridden by API callers at invocation time. This enables a single agent definition to serve multiple use cases.

### Acceptance Criteria

1. **Declaration**: The `exposedParams` field is an array of strings naming LLM config fields: `["temperature", "maxTokens", "topP", "frequencyPenalty", "presencePenalty", "model"]`.

2. **Override**: When invoking an agent, the `params` object in the request body can include values for exposed parameters. These override the agent's saved defaults for that invocation only.

3. **Validation**: Override values are validated against the same constraints as the agent definition (e.g., temperature 0-2, maxTokens > 0). Invalid values return a 400 error.

4. **Silently ignored**: Parameters not listed in `exposedParams` are silently ignored if passed in the `params` object. No error is returned.

5. **No persistence**: Parameter overrides apply only to the current invocation. They do not modify the saved agent definition.

6. **Audit**: The effective configuration (after merging overrides) is stored in the `agent_executions.llmConfig` field for reproducibility.

---

## FR-AC-013: Playground

**Priority:** P2 (Nice to Have)
**Dependencies:** FR-AC-003, agent-ui package

### Description

The dashboard includes an embedded testing interface (playground) for interacting with agents directly from the browser. The playground is powered by the `agent-ui` package.

### Acceptance Criteria

1. **Access**: The playground is accessible from:
   - A "Playground" button on each row in the agent list.
   - A "Open Playground" button on the agent show page.
   - A dedicated tab on the agent edit page.

2. **Functionality**:
   - Send text messages to the agent.
   - Attach images or audio files (if the agent's `inputConfig` allows).
   - Override exposed parameters via a settings panel.
   - See real-time streaming responses (token by token).
   - View tool call cards showing tool name, arguments, and results.
   - View execution metadata (tokens, latency, model used).

3. **Session management**: Each playground session is persisted with `isPlayground: true`. Users can start new sessions or continue previous playground sessions.

4. **No production impact**: Playground sessions are excluded from production session lists by default (filterable via `isPlayground` flag).

5. **Configuration preview**: The playground shows the agent's current configuration (model, temperature, tools) alongside the conversation, enabling quick iteration.
