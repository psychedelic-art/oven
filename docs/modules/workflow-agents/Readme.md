# Workflow Agents, MCP Server & Python Sidecar

> Phase 5 — Graph-based AI agent orchestration with MCP exposure and Python runtime.
> Three packages forming the capstone of the OVEN AI stack.

---

## Packages

| Package | Name | Type | Purpose |
|---------|------|------|---------|
| `packages/module-workflow-agents` | `@oven/module-workflow-agents` | ModuleDefinition | Agent workflow orchestration extending the workflow engine |
| `packages/mcp-server` | `@oven/mcp-server` | Infrastructure | Internal MCP wrapper auto-discovering module actionSchemas |
| `packages/agent-runtime-py` | Python sidecar | FastAPI + LangGraph | Python runtime for agent workflows on Vercel serverless |

---

## How They Relate

```
module-workflow-agents
  |
  |-- Extends module-workflows (registers 13 new node types, does NOT fork the engine)
  |-- Uses module-agent-core (Tool Wrapper for module API discovery)
  |-- Uses module-ai (LLM calls, embeddings, vector stores, image gen)
  |-- Generates MCP definitions when mcpExport=true
  |
  +-- mcp-server
  |     Reads all module chat.actionSchemas via registry
  |     Generates MCP tool/resource/prompt definitions
  |     Serves via stdio (local dev) or HTTP (Vercel)
  |
  +-- agent-runtime-py
        Receives workflow JSON definitions
        Compiles to Python LangGraph StateGraphs
        Executes with LangSmith tracing
        Communicates with OVEN API via REST client
```

The critical design principle: **module-workflow-agents extends module-workflows, it does not replace it**. The existing workflow engine's state machine loop, context accumulation, node registry, and `$.path` expressions remain unchanged. Workflow Agents adds 13 new node types alongside the existing core nodes (condition, transform, delay, emit, etc.) and dynamically discovered API nodes.

---

## Dependencies

### module-workflow-agents
- `module-registry` -- core infrastructure, EventBus, API utilities
- `module-workflows` -- execution engine, node registry, state machine
- `module-agent-core` -- Tool Wrapper, agent definitions, invocation
- `module-ai` -- LLM generation, embeddings, vector stores, image generation

### mcp-server
- `module-registry` -- discovers all module actionSchemas
- `@modelcontextprotocol/sdk` -- MCP protocol implementation

### agent-runtime-py
- `langgraph>=0.2.70` -- Python graph execution
- `langchain>=0.2.14` -- LLM abstractions
- `fastapi` -- HTTP server
- `pydantic` -- settings and state models
- `asyncpg` -- PostgreSQL checkpointer

---

## Quick Start

### module-workflow-agents

Register in `apps/dashboard/src/lib/modules.ts` (after all dependencies):

```typescript
import { workflowAgentsModule } from '@oven/module-workflow-agents';

// Must come after: registry, workflows, agentCore, ai
registry.register(workflowAgentsModule);
```

Wire API routes as thin re-exports in `apps/dashboard/src/app/api/`:

```typescript
// api/agent-workflows/route.ts
import '@/lib/modules';
import '@/lib/db';
export { GET, POST } from '@oven/module-workflow-agents/api/agent-workflows.handler';
```

### mcp-server

```typescript
import { createMCPServer } from '@oven/mcp-server';
import { registry } from '@oven/module-registry';

const server = createMCPServer({ registry });

// Local dev: stdio transport
server.listen({ transport: 'stdio' });

// Vercel: HTTP transport
export default server.toHandler();
```

### agent-runtime-py

```bash
cd packages/agent-runtime-py
pip install -r requirements.txt

# Set environment
export OVEN_API_URL=http://localhost:3000/api
export OVEN_API_KEY=your-api-key
export LANGSMITH_API_KEY=optional-for-tracing

# Run locally
uvicorn src.api.main:app --reload --port 8000
```

---

## Key Exports

### module-workflow-agents

```typescript
// ModuleDefinition
export { workflowAgentsModule } from './index';

// Schema (Drizzle tables)
export {
  agentWorkflows,
  agentWorkflowVersions,
  agentWorkflowExecutions,
  agentWorkflowNodeExecutions,
  agentMemory,
  mcpServerDefinitions,
} from './schema';

// Engine components
export { AgentNodeExecutor } from './engine/agent-node-executor';
export { CheckpointManager } from './engine/checkpoint-manager';
export { CostTracker } from './engine/cost-tracker';
export { MCPGenerator } from './engine/mcp-generator';
export { MemoryManager } from './engine/memory-manager';

// Node types (registered in Node Registry)
export * from './engine/agent-nodes';
```

### mcp-server

```typescript
export { createMCPServer } from './server';
export { ToolGenerator } from './tool-generator';
export { ResourceGenerator } from './resource-generator';
export { PromptGenerator } from './prompt-generator';
```

### agent-runtime-py

```python
# FastAPI app
from src.api.main import app

# Graph compiler
from src.workflows.compiler import AgentGraphCompiler

# Node registry
from src.workflows.nodes.base import register_node, node_registry
```

---

## Database

6 tables total. See [database.md](./database.md) for full schema.

| Table | Purpose |
|-------|---------|
| `agent_workflows` | Graph definitions with agentConfig, memoryConfig, mcpExport |
| `agent_workflow_versions` | Definition snapshots for version history |
| `agent_workflow_executions` | Execution records with checkpoint and cost tracking |
| `agent_workflow_node_executions` | Per-node execution detail with token usage |
| `agent_memory` | Long-term agent memory with optional vector embedding |
| `mcp_server_definitions` | Auto-generated MCP server configurations |

---

## API Surface

- **module-workflow-agents**: 18 REST endpoints (workflow CRUD, executions, memory, MCP servers)
- **mcp-server**: 6 MCP protocol endpoints (tools/list, tools/call, resources/list, resources/read, prompts/list, prompts/get)
- **agent-runtime-py**: 4 FastAPI endpoints (execute, stream, health, nodes)

See [api.md](./api.md) for full request/response schemas.

---

## Events

14 events emitted by module-workflow-agents:

| Event | When |
|-------|------|
| `agents-workflow.workflow.created/updated/deleted` | Workflow CRUD |
| `agents-workflow.execution.started/completed/failed/paused/resumed` | Execution lifecycle |
| `agents-workflow.node.started/completed/failed` | Per-node tracking |
| `agents-workflow.memory.created/deleted` | Memory operations |
| `agents-workflow.mcp.generated` | MCP definition regenerated |

---

## Configuration

7 config keys via the module-config cascade system:

| Key | Type | Default | Scoped |
|-----|------|---------|--------|
| `MAX_TOOL_ITERATIONS` | number | 10 | Yes |
| `CHECKPOINT_ENABLED` | boolean | true | No |
| `MCP_AUTO_REGENERATE` | boolean | true | No |
| `EXECUTION_TIMEOUT_MS` | number | 300000 | Yes |
| `EXECUTION_COST_CAP_CENTS` | number | 1000 | Yes |
| `MEMORY_RETRIEVAL_TOP_K` | number | 5 | Yes |
| `PYTHON_RUNTIME_URL` | string | '' | No |

---

## Documentation Index

| File | Content |
|------|---------|
| [architecture.md](./architecture.md) | Design patterns, ASCII diagrams, execution flows |
| [module-design.md](./module-design.md) | Component breakdown, dependency graph, data flow |
| [detailed-requirements.md](./detailed-requirements.md) | Functional requirements with acceptance criteria |
| [use-case-compliance.md](./use-case-compliance.md) | Mapping to platform use cases |
| [api.md](./api.md) | All endpoints with request/response schemas |
| [database.md](./database.md) | 6 tables with column-level detail and JSONB examples |
| [secure.md](./secure.md) | Security model, permissions, isolation |
| [references.md](./references.md) | External documentation and research |
| [UI.md](./UI.md) | Dashboard components and microinteractions |
| [prompts.md](./prompts.md) | Full implementation prompt (authoritative spec) |
