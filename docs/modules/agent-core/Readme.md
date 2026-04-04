# Module Agent Core -- Overview

> **Package**: `packages/module-agent-core/`
> **Name**: `@oven/module-agent-core`
> **Dependencies**: `module-registry`, `module-roles`, `module-ai`
> **Status**: Phase 3 (Planned)
> **Spec**: [`docs/modules/10-agent-core.md`](../10-agent-core.md)

---

## What It Does

Module Agent Core is the **agent management and execution layer** for the OVEN platform. It transforms AI from a behind-the-scenes capability into a first-class platform entity that can be defined, configured, tested, versioned, invoked, and monitored -- all through a declarative system backed by PostgreSQL and the Module Registry.

An agent in OVEN is not a piece of code. It is a **persistent configuration record** -- a combination of LLM settings, a system prompt, tool bindings, and exposed parameters -- that can be invoked through a unified REST endpoint. The module handles the entire lifecycle: definition storage, tool resolution, graph construction, execution, response streaming, session management, and execution logging.

The execution engine is built on **LangGraph JS**, adapting its StateGraph model to OVEN's conventions. Agent definitions compile into executable graphs where nodes (LLM calls, tool executions, conditions, transforms) are connected by edges and conditional transitions. State flows through the graph, accumulating messages, tool results, and intermediate reasoning until the agent produces a final response.

---

## Why It Exists

Without Agent Core, building an AI agent on the OVEN platform would require:

1. Manually wiring LLM calls through `module-ai` for every agent variant.
2. Hardcoding tool integrations instead of discovering them from the registry.
3. Building custom session management for every conversational agent.
4. Implementing streaming, logging, and quota tracking per endpoint.
5. Losing the ability to version, test, and iterate on agent behavior from the dashboard.

Agent Core centralizes all of this into a single, declarative system:

- **One endpoint to invoke any agent** -- `POST /api/agents/[slug]/invoke` handles tool resolution, parameter merging, execution, and response streaming.
- **Automatic tool discovery** -- The Tool Wrapper queries the Module Registry at runtime, turning every registered module API into an available agent tool with zero configuration.
- **Declarative definitions** -- Agents are database records, not code. Change behavior by editing a row, not deploying a release.
- **Built-in observability** -- Every invocation is logged with token usage, latency, tools used, and error state.
- **Session continuity** -- Conversation history persists across invocations, enabling multi-turn reasoning with context accumulation.

---

## Architectural Position

```
  Dashboard UI               Portal / Chat Widget          External API Callers
       |                            |                              |
       v                            v                              v
  +-----------+    +------------+   |                              |
  | Playground |   | module-chat|---+                              |
  | (agent-ui) |   +-----+------+                                 |
  +-----+------+         |                                        |
        |                 |           POST /agents/[slug]/invoke   |
        +-----------------+-------------------+--------------------+
                                              |
                                              v
                                 +------------------------+
                                 |   module-agent-core    |
                                 |                        |
                                 |  AgentInvoker          |  <-- orchestrates execution
                                 |  ToolWrapper           |  <-- discovers module APIs
                                 |  GraphBuilder          |  <-- compiles StateGraphs
                                 |  NodeRegistry          |  <-- built-in node library
                                 |  SessionManager        |  <-- conversation persistence
                                 |  ExecutionTracker      |  <-- logging & metrics
                                 |  StreamingAdapter      |  <-- SSE token streaming
                                 +----------+-------------+
                                            |
                          +-----------------+-----------------+
                          |                 |                 |
                          v                 v                 v
                    +-----------+    +-----------+    +----------------+
                    | module-ai |    | module-   |    | module-        |
                    | (LLM,     |    | registry  |    | subscriptions  |
                    |  tools)   |    | (discovery)|   | (quotas)       |
                    +-----------+    +-----------+    +----------------+
```

Agent Core sits **above** the AI foundation layer (`module-ai`) and **below** the consumer-facing modules (`module-chat`, `agent-ui`). It is depended upon by:

- **module-chat** -- Routes chat messages to agents for reasoning.
- **module-workflow-agents** -- Extends agent definitions with complex multi-step graphs.
- **agent-ui** -- Provides the playground testing interface.

It depends on:

- **module-ai** -- All LLM calls, embeddings, and AI tool executions.
- **module-registry** -- Tool discovery, module enumeration, API endpoint catalog.
- **module-roles** -- Permission validation for tool calls.
- **module-subscriptions** -- Quota pre-flight checks and usage tracking.

---

## Key Concepts

### Agent Definition

A persistent record describing an agent's identity and behavior:

| Field | Purpose |
|-------|---------|
| `name`, `slug` | Human-readable name and URL-safe identifier |
| `llmConfig` | Provider, model, temperature, maxTokens, topP, penalties |
| `systemPrompt` | Base instructions defining personality and purpose |
| `toolBindings` | Which discovered tools the agent is allowed to use |
| `exposedParams` | Which LLM params API callers can override per-invocation |
| `inputConfig` | Accepted modalities (text, image, audio) |
| `workflowAgentId` | Optional link to a workflow-agent graph for multi-step reasoning |

### Tool Wrapper

The automatic bridge between the Module Registry and the LLM's function-calling interface. At runtime, it:

1. Queries `registry.getAll()` to enumerate all registered modules.
2. Reads each module's `chat.actionSchemas` for rich tool descriptions.
3. Generates function-calling tool definitions (name, description, parameters).
4. Filters tools by the agent's `toolBindings` configuration.
5. Passes the filtered tool set to the LLM during execution.

When the LLM decides to call a tool, the Tool Wrapper resolves the target endpoint, executes the HTTP call with the invoking user's permissions, and returns the result to the agent's state.

### LangGraph Integration

Agent definitions compile into LangGraph JS `StateGraph` instances. The `GraphBuilder` provides a fluent API for constructing graphs from agent configuration:

```typescript
const graph = new GraphBuilder('dental-faq-agent')
  .addNode('prompt', new PromptNode({ template: '...' }))
  .addNode('llm', new LLMNode({ model: 'fast', temperature: 0.3 }))
  .addNode('tools', new ToolExecutorNode({ allowedTools: ['kb.search'] }))
  .addEdge('prompt', 'llm')
  .addConditionalEdge('llm', routeByToolCalls, { tools: 'tools', end: END })
  .addEdge('tools', 'llm')
  .setEntryPoint('prompt')
  .compile();
```

### Node Library

Six built-in node types provide the building blocks for agent graphs:

| Node | Category | Purpose |
|------|----------|---------|
| **LLM** | `llm` | Invoke a language model with configurable parameters |
| **Tool Executor** | `tool` | Execute tool calls and return results to state |
| **Condition** | `condition` | Branch flow based on current state |
| **Transform** | `transform` | Reshape or enrich state data |
| **Human Review** | `human-in-the-loop` | Pause for human approval before continuing |
| **Memory** | `memory` | Read/write long-term memory for cross-session recall |

### Sessions and Execution Tracking

Every agent conversation is persisted as a **session** containing a sequence of **messages** (user, assistant, system, tool). Each invocation creates an **execution record** tracking tokens consumed, latency, tools invoked, and completion status.

---

## Quick Start

### 1. Define an Agent

```typescript
// POST /api/agents
{
  "name": "Dental FAQ Assistant",
  "slug": "dental-faq",
  "description": "Answers patient questions using the knowledge base",
  "llmConfig": {
    "provider": "openai",
    "model": "fast",
    "temperature": 0.3,
    "maxTokens": 1024
  },
  "systemPrompt": "You are a helpful dental clinic assistant for {{businessName}}. Answer patient questions using the knowledge base. Respond in {{language}}.",
  "toolBindings": ["kb.searchEntries", "kb.getEntry"],
  "exposedParams": ["temperature", "maxTokens"],
  "inputConfig": { "modalities": ["text", "image"] },
  "enabled": true
}
```

### 2. Invoke the Agent

```typescript
// POST /api/agents/dental-faq/invoke
{
  "messages": [
    { "role": "user", "content": [{ "type": "text", "text": "What are your office hours?" }] }
  ],
  "params": { "temperature": 0.1 },
  "stream": true
}
```

### 3. Resume a Session

```typescript
// POST /api/agents/dental-faq/invoke
{
  "sessionId": 42,
  "messages": [
    { "role": "user", "content": [{ "type": "text", "text": "And on weekends?" }] }
  ],
  "stream": true
}
```

---

## Exports

```typescript
// ModuleDefinition
export { agentCoreModule } from './index';

// Schema (Drizzle tables)
export {
  agents,
  agentVersions,
  agentNodeDefinitions,
  agentSessions,
  agentMessages,
  agentExecutions,
} from './schema';

// Types
export type {
  Agent,
  AgentVersion,
  AgentNodeDefinition,
  AgentSession,
  AgentMessage,
  AgentExecution,
  AgentState,
  AgentNode,
  NodeCategory,
  NodeConfig,
  ValidationResult,
  InvokeRequest,
  InvokeResponse,
  ToolDefinition,
  ToolCallResult,
  ExposedParam,
  LLMConfig,
  MessagePart,
  StreamEvent,
} from './types';

// Engine (for programmatic use by module-chat, module-workflow-agents)
export { AgentInvoker } from './engine/invoker';
export { ToolWrapper } from './engine/tool-wrapper';
export { GraphBuilder } from './engine/graph-builder';
export { NodeRegistry } from './engine/node-registry';
export { SessionManager } from './engine/session-manager';

// Seed
export { seedAgentCore } from './seed';
```

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | Design patterns, ASCII diagrams, component interactions |
| [Module Design](./module-design.md) | Dependency graph, internal components, data flow |
| [Detailed Requirements](./detailed-requirements.md) | Functional requirements FR-AC-001 through FR-AC-013 |
| [Use Case Compliance](./use-case-compliance.md) | How agent-core satisfies platform use cases |
| [API Reference](./api.md) | All endpoints with request/response schemas |
| [Database Schema](./database.md) | 6 tables with column-level detail |
| [Security](./secure.md) | Permission model, injection defense, audit trail |
| [References](./references.md) | External specifications and prior art |
| [Dashboard UI](./UI.md) | React Admin views, playground, microinteractions |
