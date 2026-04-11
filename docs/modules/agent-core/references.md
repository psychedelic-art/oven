# Module Agent Core -- References

> External specifications, libraries, prior art, and design influences for the agent management layer.

---

## Core Libraries

### LangGraph JS

- **Documentation**: https://langchain-ai.github.io/langgraphjs/
- **GitHub**: https://github.com/langchain-ai/langgraphjs
- **Relevance**: Agent Core's graph execution engine is built on LangGraph JS. The `GraphBuilder` compiles agent definitions into LangGraph `StateGraph` instances. Key concepts adopted: state channels, conditional edges, checkpointing, and the node-as-function pattern.
- **Key concepts used**:
  - `StateGraph` -- The core graph abstraction. Nodes are functions, edges define transitions.
  - `END` -- Special node that terminates graph execution.
  - `Annotation` -- State schema definition for type-safe channels.
  - `MemorySaver` / `PostgresSaver` -- Checkpointer implementations for state persistence.
  - Conditional edges -- Route execution based on runtime state (e.g., tool calls present vs final answer).

### Vercel AI SDK

- **Documentation**: https://sdk.vercel.ai/docs
- **Relevance**: `module-ai` (Agent Core's dependency) uses the Vercel AI SDK for LLM provider abstraction. Agent Core's tool calling format aligns with the AI SDK's tool definition schema.
- **Key integrations**:
  - `generateText` / `streamText` -- Used by LLM nodes for text generation.
  - `generateObject` -- Used for structured output extraction.
  - Tool calling -- The AI SDK's tool definition format is the basis for Agent Core's `ToolDefinition` type.
  - Streaming -- The AI SDK's streaming primitives power the SSE adapter.

---

## Provider Specifications

### OpenAI Function Calling

- **Specification**: https://platform.openai.com/docs/guides/function-calling
- **Relevance**: The function-calling format used by OpenAI models is the primary tool integration pattern. Agent Core's tool definitions generate OpenAI-compatible function schemas.
- **Key patterns adopted**:
  - `tools` parameter with `function` type definitions.
  - `tool_choice` for controlling when the model calls tools.
  - Parallel function calling (multiple tool calls in a single response).
  - `tool` role messages for returning function results.

### Anthropic Tool Use

- **Specification**: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- **Relevance**: When the agent's LLM provider is Anthropic, tool definitions are converted to Anthropic's tool use format. The Tool Wrapper handles format translation transparently.
- **Key patterns adopted**:
  - `tools` parameter with `input_schema` (JSON Schema).
  - `tool_use` content blocks in assistant responses.
  - `tool_result` content blocks for returning results.

### Google Gemini Function Calling

- **Specification**: https://ai.google.dev/gemini-api/docs/function-calling
- **Relevance**: When using Google models, tool definitions are converted to Gemini's function declaration format.

---

## Design Patterns and Papers

### ReAct: Synergizing Reasoning and Acting in Language Models

- **Paper**: Yao et al., 2022 (https://arxiv.org/abs/2210.03629)
- **Relevance**: The default agent graph topology implements the ReAct pattern: the LLM alternates between reasoning (generating text) and acting (calling tools) until it produces a final answer. This is the `prompt -> llm -> (tools -> llm)* -> END` loop.

### Model Context Protocol (MCP)

- **Specification**: https://modelcontextprotocol.io/
- **Relevance**: Agent Core's tool discovery mechanism is conceptually aligned with MCP's approach to exposing tools to language models. The Tool Wrapper's auto-discovery via the Module Registry serves a similar role to MCP servers exposing tools to clients. Future integration may allow MCP servers to register as tool providers in the ToolRegistry.

### LangSmith Tracing

- **Documentation**: https://docs.smith.langchain.com/
- **Relevance**: Agent Core's execution logging (ExecutionTracker) is influenced by LangSmith's tracing model. Each execution creates a trace with spans for individual node executions, tool calls, and LLM invocations. While Agent Core uses its own PostgreSQL-backed logging rather than the LangSmith API, the data model is compatible for future LangSmith export.

---

## Industry Prior Art

### Voiceflow

- **Website**: https://www.voiceflow.com/
- **Relevance**: Voiceflow's agent builder uses a visual graph-based approach to define conversational flows. Agent Core's node library and graph topology concepts are influenced by Voiceflow's step types (text, condition, set variable, API call, etc.). Key difference: Voiceflow is a visual-first builder, while Agent Core is a config-first system with optional visual editing via `module-workflow-agents`.

### Botpress

- **Website**: https://botpress.com/
- **Documentation**: https://botpress.com/docs
- **Relevance**: Botpress's agent architecture separates agent definitions (configuration) from execution (runtime). Their "Knowledge Base" integration pattern influenced Agent Core's Tool Wrapper design -- both auto-discover available data sources and expose them as tools. Botpress's "hooks" system (pre-processing, post-processing) maps to Agent Core's node lifecycle decorators.

### Rasa

- **Website**: https://rasa.com/
- **Documentation**: https://rasa.com/docs/
- **Relevance**: Rasa's pipeline architecture (NLU, dialogue management, action execution) influenced Agent Core's node categorization. Rasa's "custom actions" pattern (external services called during dialogue) maps directly to Agent Core's Tool Executor node. Rasa's story-based training approach is conceptually different from Agent Core's LLM-driven reasoning, but both share the goal of declarative agent configuration.

### n8n AI Agent Architecture

- **Website**: https://n8n.io/
- **Documentation**: https://docs.n8n.io/advanced-ai/
- **Relevance**: n8n's AI agent nodes demonstrate how workflow automation platforms integrate LLM reasoning. Their approach of wrapping AI tools in a workflow graph directly influenced Agent Core's integration with `module-workflow-agents`. n8n's "sub-workflow" pattern (agent delegates to a workflow for complex tasks) maps to Agent Core's `workflowAgentId` reference.

### Dify

- **Website**: https://dify.ai/
- **Relevance**: Dify's agent framework provides a declarative approach to building AI applications with tool integration, prompt management, and conversation memory. Their orchestration model (chatflow/workflow modes) influenced Agent Core's execution strategy pattern (SingleTurn vs MultiTurn vs Workflow).

---

## OVEN Platform References

### Module Registry

- **Specification**: [`docs/module-rules.md`](../module-rules.md)
- **Relevance**: The Module Registry is the foundation of Agent Core's tool discovery. Rule 2 (Discoverable) defines how modules expose themselves via `chat.actionSchemas`, which the Tool Wrapper reads to build the tool catalog.

### Module AI

- **Specification**: [`docs/modules/12-ai.md`](../12-ai.md)
- **Detailed docs**: [`docs/modules/ai/Readme.md`](../ai/Readme.md)
- **Relevance**: Module AI provides the AI services foundation layer. All LLM calls in Agent Core are routed through Module AI's provider registry, middleware stack (usage tracking, rate limiting, guardrails), and tool catalog.

### Module Workflow Agents

- **Specification**: [`docs/modules/11-workflow-agents.md`](../11-workflow-agents.md)
- **Relevance**: Extends Agent Core with complex multi-step graph topologies. When an agent has a `workflowAgentId`, execution is delegated to the workflow-agent engine. The visual graph editor for agent workflows lives in this module.

### Module Chat

- **Specification**: [`docs/modules/08-chat.md`](../08-chat.md)
- **Relevance**: Module Chat is the primary consumer of Agent Core. Chat sessions route user messages to agents for reasoning. The chat widget (portal-side) invokes agents through the streaming endpoint.

### Module Subscriptions

- **Specification**: [`docs/modules/21-module-subscriptions.md`](../21-module-subscriptions.md)
- **Relevance**: Provides quota management and usage metering. Agent Core calls the UsageMeteringService for pre-flight quota checks and post-execution usage tracking.

### Agent UI Package

- **Specification**: [`docs/modules/16-agent-ui.md`](../16-agent-ui.md)
- **Relevance**: The `agent-ui` package provides the playground React component that is embedded in the dashboard for testing agents. It uses Agent Core's streaming invoke endpoint and renders tool call cards, execution metadata, and conversation history.

---

## Standards and Formats

### JSON Schema

- **Specification**: https://json-schema.org/
- **Relevance**: Tool parameter definitions use JSON Schema format for describing function parameters. The `parameters` field in `ToolDefinition` and `chat.actionSchemas` follows JSON Schema conventions.

### Server-Sent Events (SSE)

- **Specification**: https://html.spec.whatwg.org/multipage/server-sent-events.html
- **Relevance**: Agent Core's streaming response format uses the SSE protocol. Events are formatted as `event: {type}\ndata: {json}\n\n`.

### OpenAI Chat Completions API

- **Specification**: https://platform.openai.com/docs/api-reference/chat
- **Relevance**: The message format (role + content parts) used in Agent Core's invoke endpoint is derived from the OpenAI Chat Completions API. This ensures compatibility with the Vercel AI SDK and broad LLM provider support.
