# Module: Agent Core

> **Package**: `packages/module-agent-core/`
> **Name**: `@oven/module-agent-core`
> **Dependencies**: `module-registry`, `module-roles`, `module-ai`
> **Status**: Planned

---

## 1. Overview

Agent Core is the **foundational agent management layer** for the OVEN platform. It provides a CRUD system for defining, configuring, testing, and exposing AI agents as first-class platform entities. Each agent is a persistent, parameterized configuration that can be invoked through a unified `/api/agents` endpoint, accepting messages (text, images, audio) and returning reasoned responses.

The design is inspired by LangGraph's architectural model — agents are defined as **graphs of reusable nodes** (steps) connected by edges (transitions), with shared state flowing through the graph. However, Agent Core adapts this model to OVEN's conventions: definitions are stored as JSONB, discovered via the Module Registry, and governed by the existing permissions system.

### Design Goals

- **Declarative agent definitions** — An agent is a saved configuration (model, system prompt, temperature, available tools, graph topology) stored in the database, not hardcoded logic
- **Unified invocation endpoint** — Any registered agent can be called through the same REST API, receiving a list of messages and returning a response
- **Multimodal input** — The agent endpoint accepts text, images, and audio as message attachments, enabling vision and transcription tasks
- **Exposable parameters** — Each agent declares which LLM parameters (model, temperature, max tokens, etc.) can be overridden at invocation time via the API
- **Playground testing** — Agents can be tested directly from the dashboard listing or detail view through an embedded conversational playground
- **Registry-aware tool resolution** — Agents can use any module API endpoint as a tool without explicit registration, by discovering available endpoints through the Module Registry at runtime

---

## 2. Core Concepts

### Agent Definition

An agent is a **persistent record** describing how a particular AI agent should behave. It contains:

- **Identity** — Name, slug, description, version
- **LLM Configuration** — Provider, model identifier, temperature, max tokens, top-p, frequency penalty, presence penalty, stop sequences
- **System Prompt** — The base instructions that define the agent's personality and purpose
- **Exposed Parameters** — A declaration of which LLM parameters can be overridden when invoking the agent through the API. For example, an agent may expose `temperature` and `maxTokens` so callers can tune behavior per-request without modifying the saved definition
- **Tool Bindings** — Which tools (module API endpoints, custom functions, or external services) the agent is allowed to use during reasoning
- **Input Configuration** — Accepted input modalities (text, image, audio) and any preprocessing rules
- **Graph Topology** — Optional reference to a workflow-agent graph (from `module-workflow-agents`) that defines multi-step reasoning flows

### Node Library (Reusable Step Definitions)

Inspired by LangGraph's node concept, Agent Core maintains a **library of reusable node definitions** — discrete, composable reasoning steps that can be assembled into agent graphs. Nodes are categorized as:

- **LLM Nodes** — Invoke a language model with configurable parameters and system prompts. These are the primary reasoning units
- **Tool Nodes** — Execute an external action (API call, database query, computation) and return the result to the graph state
- **Condition Nodes** — Branch the flow based on the current state (e.g., "did the tool return an error?", "does the user's message contain an image?")
- **Transform Nodes** — Reshape, filter, or enrich the state data before passing it to the next node
- **Human-in-the-Loop Nodes** — Pause execution and wait for human approval or input before continuing. Useful for high-stakes actions (data deletion, external communications)
- **Memory Nodes** — Read from or write to the agent's long-term memory store, enabling cross-session context recall

Each node definition includes:
- A unique identifier and human-readable label
- Category classification (for UI palette grouping)
- Input and output parameter declarations (name, type, description, required flag)
- The node's execution behavior description (what it does)

Nodes are **not executable code** in the Agent Core module — they are **declarative specifications**. The execution engine lives in `module-workflow-agents`, which inherits the existing workflow engine and extends it for agent-specific node types.

### Tool Wrapper (Automatic Module API Integration)

One of the most important capabilities of Agent Core is the **Tool Wrapper** — a mechanism that automatically exposes any registered module's API endpoints as tools available to agents, without requiring explicit per-endpoint configuration.

How it works:

1. At runtime, the Tool Wrapper queries `registry.getAll()` to discover all registered modules and their `apiHandlers`
2. For each API endpoint, it generates a tool description (name, description, parameters, HTTP method, route) following a function-calling schema format
3. When an agent decides to use a tool during reasoning, the Tool Wrapper resolves the target endpoint, constructs the HTTP request with the appropriate parameters, executes the call using the invoking user's permissions, and returns the response to the agent's state
4. If a module adds new endpoints (e.g., a new CRUD route), they become available as tools to all agents automatically on the next registry refresh — no agent reconfiguration needed

The Tool Wrapper respects the permissions system: an agent can only invoke endpoints that the calling user has permission to access. The agent does not bypass RLS policies or role restrictions.

Modules can optionally enhance their tool descriptions by declaring a `chat` block in their `ModuleDefinition` (as described in the existing Chat module spec), providing richer descriptions, parameter documentation, and capability summaries that help the LLM choose the right tool.

### Multimodal Input Handling

The agent invocation endpoint supports multimodal messages:

- **Text** — Standard text content in the message body
- **Images** — Base64-encoded or URL-referenced images attached to messages. The agent can process these if the underlying LLM supports vision capabilities
- **Audio** — Base64-encoded audio attachments. The agent can transcribe or analyze audio if the underlying LLM or a preprocessing pipeline supports it

Each message in the conversation pipeline may contain one or more content parts (text, image, audio), following a parts-based message format similar to OpenAI's multimodal message structure.

### Exposed Parameters & API Override

Each agent definition declares an `exposedParams` list — the LLM configuration fields that external callers are allowed to override when invoking the agent. For example:

- An agent with `exposedParams: ["temperature", "maxTokens"]` allows the API caller to pass `{ "temperature": 0.2, "maxTokens": 500 }` in the request body, overriding the agent's saved defaults for that specific invocation
- Parameters not listed in `exposedParams` cannot be overridden — they use the saved agent configuration
- This mechanism enables a single agent definition to serve multiple use cases (e.g., a "summarizer" agent that can be called with low temperature for factual summaries or higher temperature for creative rewrites)

---

## 3. Database Schema

### Tables

**`agents`** — Agent definitions (the core CRUD entity)
- `id` (serial, PK)
- `name` (varchar) — human-readable name
- `slug` (varchar, unique) — URL-safe identifier
- `description` (text) — what this agent does
- `llmConfig` (JSONB) — provider, model, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, stopSequences
- `systemPrompt` (text) — base system instructions
- `exposedParams` (JSONB) — array of parameter names that can be overridden at invocation
- `toolBindings` (JSONB) — array of tool identifiers this agent is allowed to use (module endpoints, custom tools)
- `inputConfig` (JSONB) — accepted modalities (text, image, audio), preprocessing rules
- `workflowAgentId` (integer, nullable) — optional FK to a workflow-agent graph definition (from `module-workflow-agents`)
- `metadata` (JSONB) — arbitrary key-value metadata
- `enabled` (boolean, default true)
- `version` (integer, default 1) — incremented on definition changes
- `createdAt`, `updatedAt` (timestamps)

**`agent_versions`** — Version history snapshots
- `id` (serial, PK)
- `agentId` (integer, FK -> agents)
- `version` (integer)
- `definition` (JSONB) — full snapshot of the agent configuration at this version
- `description` (text, nullable) — optional changelog note
- `createdAt` (timestamp)

**`agent_node_definitions`** — Reusable node library
- `id` (serial, PK)
- `name` (varchar) — human-readable label
- `slug` (varchar, unique) — identifier
- `category` (varchar) — llm, tool, condition, transform, human-in-the-loop, memory
- `description` (text) — what this node does
- `inputs` (JSONB) — array of input parameter declarations
- `outputs` (JSONB) — array of output parameter declarations
- `config` (JSONB) — default configuration for this node type
- `isSystem` (boolean, default false) — system nodes cannot be deleted
- `createdAt`, `updatedAt` (timestamps)

**`agent_sessions`** — Conversation sessions with agents
- `id` (serial, PK)
- `agentId` (integer, FK -> agents)
- `userId` (integer) — who initiated the session
- `title` (varchar, nullable) — auto-generated or user-set
- `context` (JSONB) — accumulated session context (referenced entities, state)
- `status` (varchar) — active, archived
- `isPlayground` (boolean, default false) — whether this is a playground test session
- `createdAt`, `updatedAt` (timestamps)

**`agent_messages`** — Individual messages in a session
- `id` (serial, PK)
- `sessionId` (integer, FK -> agent_sessions)
- `role` (varchar) — user, assistant, system, tool
- `content` (JSONB) — parts-based content (text, image references, audio references)
- `toolCalls` (JSONB, nullable) — tool calls made by the assistant in this message
- `toolResults` (JSONB, nullable) — results returned by tool execution
- `metadata` (JSONB) — model used, tokens consumed, latency, cost
- `createdAt` (timestamp)

**`agent_executions`** — Execution log for agent invocations
- `id` (serial, PK)
- `agentId` (integer, FK -> agents)
- `sessionId` (integer, FK -> agent_sessions)
- `messageId` (integer, FK -> agent_messages)
- `status` (varchar) — running, completed, failed
- `llmConfig` (JSONB) — the effective LLM config used (after parameter overrides)
- `toolsUsed` (JSONB) — array of tools invoked during this execution
- `tokenUsage` (JSONB) — input tokens, output tokens, total
- `latencyMs` (integer) — total execution time
- `error` (text, nullable)
- `startedAt`, `completedAt` (timestamps)

---

## 4. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/agents` | List all agent definitions |
| POST | `/api/agents` | Create a new agent definition |
| GET | `/api/agents/[id]` | Get a specific agent definition |
| PUT | `/api/agents/[id]` | Update an agent definition (auto-versions) |
| DELETE | `/api/agents/[id]` | Delete an agent definition |
| GET | `/api/agents/[id]/versions` | List version history for an agent |
| POST | `/api/agents/[id]/versions/[versionId]/restore` | Restore a previous version |
| POST | `/api/agents/[slug]/invoke` | **Invoke an agent** — send messages, get response |
| GET | `/api/agent-nodes` | List all node definitions in the library |
| POST | `/api/agent-nodes` | Create a new node definition |
| GET | `/api/agent-nodes/[id]` | Get a specific node definition |
| PUT | `/api/agent-nodes/[id]` | Update a node definition |
| DELETE | `/api/agent-nodes/[id]` | Delete a node definition |
| GET | `/api/agent-sessions` | List agent conversation sessions |
| POST | `/api/agent-sessions` | Create a new session |
| GET | `/api/agent-sessions/[id]` | Get a session with messages |
| DELETE | `/api/agent-sessions/[id]` | Archive a session |
| GET | `/api/agent-sessions/[id]/messages` | List messages in a session |
| POST | `/api/agent-sessions/[id]/messages` | Send a message to the agent (triggers reasoning) |
| GET | `/api/agent-executions` | List execution logs |
| GET | `/api/agent-executions/[id]` | Get execution details |
| GET | `/api/agents/tools` | List all available tools (discovered from registry) |

### Invoke Endpoint Behavior (`POST /api/agents/[slug]/invoke`)

The invoke endpoint is the primary way to interact with an agent. It accepts:

- `messages` — Array of message objects, each with `role` and `content` (parts-based: text, image, audio)
- `params` — Optional parameter overrides (only fields listed in the agent's `exposedParams` are accepted; others are silently ignored)
- `sessionId` — Optional existing session ID to continue a conversation
- `stream` — Optional boolean to request streaming response (Server-Sent Events)

The endpoint:
1. Loads the agent definition by slug
2. Merges any allowed parameter overrides into the LLM config
3. Creates or continues a session
4. Resolves available tools via the Tool Wrapper (filtered by agent's `toolBindings`)
5. Executes the agent's reasoning (single LLM call or workflow-agent graph execution)
6. Records the execution in `agent_executions`
7. Returns the assistant's response (or streams it)

---

## 5. Dashboard UI

### Resources (React Admin CRUD)
- **Agents** — List, create, edit, show views for agent definitions
- **Node Definitions** — List, create, edit views for the node library
- **Agent Sessions** — List and show views for conversation history
- **Agent Executions** — List and show views for execution logs

### Playground (Testing Mode)

The agent listing page includes a **playground action** on each row — a button that opens an inline or modal conversational interface where the user can:

- Send text messages to the agent
- Attach images or audio files
- Override exposed parameters via a settings panel
- See real-time agent responses, including tool call cards showing which tools were invoked and their results
- View execution metadata (tokens, latency, model used)

The agent detail/show page includes a full-page playground tab with the same capabilities, plus the ability to inspect the agent's configuration and version history side-by-side.

Playground sessions are marked with `isPlayground: true` in the database so they can be filtered from production sessions.

### Menu Section
```
──── Agents ────
Agents
Node Definitions
Sessions
Executions
```

---

## 6. Registry Discovery

### Self-Description

Agent Core registers itself in the Module Registry with a `chat` block so that other modules (including the Chat module) can discover and interact with agents:

- **description**: "Manages AI agent definitions, configurations, and invocations. Provides a unified endpoint for multi-turn agent conversations with multimodal support."
- **capabilities**: "create agents", "invoke agents", "manage node definitions", "test agents in playground", "list available tools"
- **actionSchemas**: Structured schemas for creating agents, invoking agents by slug, listing sessions, etc.

### Tool Wrapper Discovery

The Tool Wrapper performs the following discovery at runtime:

1. Calls `registry.getAll()` to get all registered modules
2. For each module, iterates over `apiHandlers` to enumerate every endpoint
3. Generates a tool specification for each endpoint containing:
   - Tool name in `{module}.{resource}.{action}` format (matching the existing workflow node naming convention)
   - Description (from the module's `chat.actionSchemas` if available, otherwise auto-generated from the route pattern)
   - Parameter schema (derived from the handler's expected input)
   - HTTP method and route
   - Required permissions (from `api_endpoint_permissions` if configured)
4. Caches the tool catalog and refreshes periodically or when module registrations change

This means that when a new module is registered with API endpoints, agents automatically gain access to those endpoints as tools — zero configuration required.

---

## 7. Events

| Event | Payload |
|-------|---------|
| `agents.agent.created` | id, name, slug |
| `agents.agent.updated` | id, name, slug, version |
| `agents.agent.deleted` | id, slug |
| `agents.session.created` | id, agentId, userId |
| `agents.session.archived` | id, agentId, userId |
| `agents.message.sent` | id, sessionId, role |
| `agents.execution.started` | id, agentId, sessionId |
| `agents.execution.completed` | id, agentId, sessionId, status, tokenUsage, latencyMs |
| `agents.execution.failed` | id, agentId, sessionId, error |
| `agents.tool.invoked` | executionId, toolName, moduleSlug, status |
| `agents.node.created` | id, name, category |
| `agents.node.updated` | id, name, category |
| `agents.node.deleted` | id |

---

## 8. Integration Points

| Module | Integration |
|--------|-------------|
| **module-registry** | Discovers all modules and their API endpoints for the Tool Wrapper. Reads `chat` blocks for enriched tool descriptions. |
| **module-roles** | Validates that the invoking user has permission to call each tool the agent attempts to use. Agents never bypass RLS or role restrictions. |
| **module-workflow-agents** | When an agent has a `workflowAgentId`, execution is delegated to the workflow-agent engine for multi-step graph-based reasoning. |
| **module-ai** | Provides the AI services layer. Agent invocations resolve LLM models through Module AI's provider registry. All LLM calls, embeddings, image generation, and other AI capabilities are accessed through Module AI's tool catalog and middleware stack (usage tracking, rate limiting, guardrails). The Tool Wrapper discovers `ai.*` tools from Module AI alongside module API tools. |
| **module-chat** | Chat can discover and invoke agents through their registry declarations. An agent can serve as the reasoning backend for a Chat session. |
| **All other modules** | Any module's API endpoints are automatically available as agent tools through the Tool Wrapper. Module AI's tools (`ai.*`) are also available. |

---

## 9. Non-Functional Requirements

- **Streaming** — The invoke endpoint supports Server-Sent Events (SSE) for streaming token-by-token responses to the client
- **Concurrency** — Multiple agent invocations can run concurrently; sessions are isolated
- **Idempotency** — Creating a session or sending a message is idempotent when the same request ID is provided
- **Observability** — Every execution is logged with token usage, latency, tools used, and errors for monitoring and cost tracking
- **Rate Limiting** — The invoke endpoint should support configurable rate limits per user and per agent to prevent abuse
- **Timeout** — Agent executions have a configurable maximum duration (default aligned with the platform's hosting limits); exceeded executions are marked as failed
