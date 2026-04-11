# References — Workflow Agents, MCP Server & Python Sidecar

> External documentation, libraries, specifications, and research referenced by these packages.

---

## Core Libraries

### LangGraph JS

- **Documentation**: https://langchain-ai.github.io/langgraphjs/
- **GitHub**: https://github.com/langchain-ai/langgraphjs
- **Relevance**: The JavaScript runtime for agent graph execution. module-workflow-agents uses LangGraph's StateGraph pattern adapted to OVEN's node registry system. Key concepts: state channels, conditional edges, checkpointing, and subgraph composition.
- **Key APIs**: `StateGraph`, `addNode`, `addEdge`, `addConditionalEdges`, `compile`, `MemorySaver`, `PostgresSaver`

### LangGraph Python

- **Documentation**: https://langchain-ai.github.io/langgraph/
- **GitHub**: https://github.com/langchain-ai/langgraph
- **Package**: `langgraph>=0.2.70`
- **Relevance**: The Python sidecar (agent-runtime-py) compiles OVEN workflow definitions into Python LangGraph StateGraphs. Uses the same conceptual model as the JS version but with Python async patterns.
- **Key APIs**: `StateGraph`, `add_node`, `add_edge`, `add_conditional_edges`, `compile`, `AsyncPostgresSaver`

### LangSmith

- **Documentation**: https://docs.smith.langchain.com/
- **Relevance**: Optional tracing and observability platform for both JS and Python runtimes. When `LANGSMITH_API_KEY` is set in environment, all LangGraph executions are automatically traced. Provides execution visualization, latency analysis, token tracking, and debugging.
- **Integration**: Zero-config when the env var is set. LangGraph's built-in tracing sends events to LangSmith automatically.

### Model Context Protocol (MCP)

- **Specification**: https://modelcontextprotocol.io/
- **GitHub**: https://github.com/modelcontextprotocol
- **Relevance**: The mcp-server package implements the MCP specification to expose OVEN module capabilities as tools to external AI systems. The protocol defines how AI models discover and invoke tools, read resources, and retrieve prompts.
- **Key concepts**: Tools (callable functions with JSON Schema inputs), Resources (readable data), Prompts (parameterized templates), Transports (stdio, HTTP)

### @modelcontextprotocol/sdk

- **npm**: https://www.npmjs.com/package/@modelcontextprotocol/sdk
- **GitHub**: https://github.com/modelcontextprotocol/typescript-sdk
- **Relevance**: The TypeScript SDK used by the mcp-server package to implement the MCP protocol. Provides `Server`, `StdioServerTransport`, tool registration helpers, and protocol message handling.
- **Key APIs**: `Server`, `StdioServerTransport`, `server.setRequestHandler`, `ListToolsRequestSchema`, `CallToolRequestSchema`

### FastAPI

- **Documentation**: https://fastapi.tiangolo.com/
- **Relevance**: The web framework for agent-runtime-py. Provides async request handling, automatic OpenAPI documentation, dependency injection, and lifespan management for the checkpointer connection.
- **Key features used**: async route handlers, lifespan context managers, Pydantic request/response models, SSE streaming via `StreamingResponse`

### Pydantic

- **Documentation**: https://docs.pydantic.dev/
- **Relevance**: Used in agent-runtime-py for request/response validation (API models), configuration management (`BaseSettings`), and the `AgentState` model that flows through the LangGraph graph.
- **Key classes**: `BaseModel`, `BaseSettings`, `Field`

### LangChain

- **Documentation**: https://python.langchain.com/
- **Package**: `langchain>=0.2.14`
- **Relevance**: Provides base abstractions used by the Python node implementations, particularly for message types (`HumanMessage`, `AIMessage`, `ToolMessage`), tool definitions, and the LLM interface that LangGraph nodes consume.

---

## Database

### AsyncPostgresSaver (LangGraph Checkpointer)

- **Documentation**: https://langchain-ai.github.io/langgraph/reference/checkpoints/#langgraph.checkpoint.postgres.aio.AsyncPostgresSaver
- **Relevance**: The PostgreSQL-backed checkpointer used by agent-runtime-py for state persistence. Stores graph state at node boundaries and enables resume after failure or pause. The OVEN implementation extends this with execution-record synchronization.
- **Key methods**: `aput`, `aget`, `alist`

### pgvector

- **Documentation**: https://github.com/pgvector/pgvector
- **Relevance**: PostgreSQL extension enabling the `vector(1536)` column type on the `agent_memory` table. Used for semantic memory retrieval via cosine similarity search. Index types: IVFFlat (faster builds) and HNSW (faster queries).
- **Key operations**: `<=>` (cosine distance), `<->` (L2 distance), `CREATE INDEX USING hnsw`

---

## Architectural Inspiration

### n8n Workflow Architecture

- **Documentation**: https://docs.n8n.io/
- **Relevance**: Inspiration for the node registry pattern. n8n's approach of self-describing nodes that register with metadata (type, inputs, outputs, description) informed OVEN's Node Registry design. The visual editor's node palette and property panels follow similar UX patterns.
- **Key concepts adopted**: Node self-registration, typed inputs/outputs, credential handling per node, execution tracking per node

### Temporal.io Checkpoint Patterns

- **Documentation**: https://docs.temporal.io/
- **Relevance**: Inspiration for OVEN's checkpoint and resume model. Temporal's approach to durable execution (persisting state at decision points, replaying history on resume) influenced the CheckpointManager design. Key difference: OVEN uses simpler JSONB snapshots rather than Temporal's event-sourcing model.
- **Key concepts adopted**: State persistence at node boundaries, resume from checkpoint, timeout handling, activity retry

---

## AI Patterns

### ReAct Pattern

- **Paper**: Yao et al., "ReAct: Synergizing Reasoning and Acting in Language Models" (2022)
- **URL**: https://arxiv.org/abs/2210.03629
- **Relevance**: The theoretical foundation for the `agent.toolLoop` node. The ReAct pattern interleaves reasoning (LLM thought steps) with acting (tool invocations) in a loop until a final answer is produced. The tool loop node implements this cycle with configurable iteration limits.

### Human-in-the-Loop AI Patterns

- **Relevance**: The `agent.humanReview` node implements the interrupt-review-resume pattern common in enterprise AI systems. Key design decisions informed by industry patterns:
  - Checkpoint before interrupt (not after) to preserve exact state
  - Three-way decision model (approve/edit/reject) rather than binary
  - Reviewer identity recorded for audit trail
  - Timeout handling for abandoned reviews

### Retrieval-Augmented Generation (RAG)

- **Paper**: Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020)
- **URL**: https://arxiv.org/abs/2005.11401
- **Relevance**: The `agent.rag` node implements RAG by combining vector store retrieval with LLM generation. The node searches a configured vector store, retrieves relevant context, and injects it into the conversation before generation.

---

## Deployment

### Vercel Python Serverless Functions

- **Documentation**: https://vercel.com/docs/functions/runtimes/python
- **Relevance**: The agent-runtime-py package is deployed as a Vercel serverless Python function. The `vercel.json` configuration maps the FastAPI app to a serverless handler. Key constraints: cold start time, memory limits, execution timeout (configured via `maxDuration`).
- **Configuration**: `{ "functions": { "src/api/main.py": { "runtime": "python3.11" } } }`

### Vercel AI SDK

- **Documentation**: https://sdk.vercel.ai/
- **Relevance**: Used by module-ai (a dependency) for LLM interactions. The `agent.llm` node in module-workflow-agents calls module-ai's generation functions, which use the Vercel AI SDK under the hood. Key features: streaming, middleware chain, multi-provider support.

---

## OVEN Platform (Internal References)

### module-workflows

- **Location**: `packages/module-workflows/`
- **Documentation**: `docs/workflows/`
- **Relevance**: The parent engine that module-workflow-agents extends. Provides: WorkflowDefinition format, WorkflowEngine execution loop, Node Registry, context accumulation, `$.path` expressions, execution persistence.

### module-agent-core

- **Location**: `packages/module-agent-core/`
- **Documentation**: `docs/modules/agent-core/`
- **Relevance**: Provides Tool Wrapper (auto-discovers module APIs as tools), agent definitions, session management, and the invocation mechanism used by `agent.subagent` nodes.

### module-ai

- **Location**: `packages/module-ai/`
- **Documentation**: `docs/modules/ai/`
- **Relevance**: Provides all AI services consumed by agent nodes: LLM generation (via provider registry), embeddings, image generation, vector store operations, and RAG. All AI calls inherit module-ai's middleware (usage tracking, rate limits, guardrails).

### module-subscriptions

- **Location**: `packages/module-subscriptions/`
- **Documentation**: `docs/modules/21-module-subscriptions.md`
- **Relevance**: Provides quota checking and usage tracking consumed by `core.checkQuota` and `core.trackUsage` nodes. The `UsageMeteringService` is the backend for these workflow nodes.

### module-registry

- **Location**: `packages/module-registry/`
- **Documentation**: `docs/package-composition.md`
- **Relevance**: Core infrastructure used by all three packages. Provides EventBus, API utilities (parseListParams, listResponse), database client, and the module discovery mechanism used by mcp-server.

### Module Rules

- **Location**: `docs/module-rules.md`
- **Relevance**: The compliance framework that module-workflow-agents follows. All 13 rules are satisfied (see database.md for schema compliance, api.md for API conventions, seed.ts for permissions).
