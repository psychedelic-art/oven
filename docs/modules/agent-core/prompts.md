# Module Agent Core — Implementation Prompt

> Condensed directive for implementing `packages/module-agent-core`.
> References all docs in this folder. Use as baseline context for any implementation agent.

---

## Identity

- **Package**: `packages/module-agent-core`
- **Name**: `@oven/module-agent-core`
- **Type**: ModuleDefinition (full module)
- **Phase**: 3 (depends on module-ai, module-registry)
- **Dependencies**: `module-registry`, `module-roles`, `module-ai`
- **Depended on by**: module-chat, module-workflow-agents, agent-ui

## Mission

Build the agent management layer — persistent agent definitions, a Tool Wrapper that auto-discovers every module's API endpoints as callable tools, a unified invocation endpoint with streaming, LangGraph JS integration for graph-based reasoning, and session/execution tracking. Agents are first-class platform entities: configurable, testable, versionable, and observable.

## Key Constraints

- **Monorepo**: pnpm + Turborepo. Raw TypeScript exports.
- **Framework**: Next.js 15, Drizzle ORM, Neon PostgreSQL
- **Styling**: MUI 7 + sx prop (dashboard). NO inline styles.
- **LangGraph**: Use `@langchain/langgraph` JS SDK for StateGraph construction
- **AI calls**: All LLM calls go through module-ai (never call OpenAI directly)
- **Tool discovery**: Tool Wrapper reads `registry.getAll()` + `chat.actionSchemas` — zero manual tool registration
- **Streaming**: SSE (Server-Sent Events) for token-by-token responses on invoke endpoint
- **Quota**: Pre-flight `checkQuota(tenantId, 'ai-agent-executions')` before each invocation. Track `llm-prompt-tokens` + `llm-completion-tokens` per LLM call within agent.
- **TDD**: Tests before implementation
- **No cross-module imports**: EventBus, REST API, Registry only

## Architecture (see `architecture.md`)

### Tool Wrapper (auto-discovery)
```
registry.getAll() → for each module:
  module.chat?.actionSchemas → generate tool definitions
  module.apiHandlers → generate fallback tool definitions
→ Filter by agent.toolBindings
→ Convert to Vercel AI SDK tool format (name, description, parameters as Zod)
→ Pass to LLM as available tools
```

Tool execution respects the invoking user's permissions. Agents never bypass RLS.

### LangGraph JS Integration

**Node Lifecycle** (React-inspired):
```typescript
interface AgentNode<TInput, TOutput> {
  readonly id: string;
  readonly category: 'llm' | 'tool' | 'condition' | 'transform' | 'human' | 'memory';

  init?(config: NodeConfig): Promise<void>;         // Setup resources
  validate?(input: TInput): ValidationResult;        // Pre-execution check
  execute(state: AgentState, input: TInput): Promise<TOutput>; // Core logic
  cleanup?(): Promise<void>;                         // Teardown

  getSchema(): { input: ZodSchema; output: ZodSchema };
  getDescription(): string;
}
```

**GraphBuilder** (fluent API):
```typescript
const graph = new GraphBuilder('dental-faq')
  .withState(AgentStateAnnotation)
  .addNode('prompt', new PromptAssemblyNode({ template: systemPrompt }))
  .addNode('llm', new LLMNode({ model: 'fast', temperature: 0.3 }))
  .addNode('tools', new ToolExecutorNode({ allowed: ['kb.search'] }))
  .addEdge(START, 'prompt')
  .addEdge('prompt', 'llm')
  .addConditionalEdge('llm', routeByToolCalls, { hasTools: 'tools', done: END })
  .addEdge('tools', 'llm')
  .compile({ checkpointer: pgCheckpointer });
```

**AgentState** (LangGraph Annotation):
```typescript
const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: messagesReducer }),
  toolCalls: Annotation<ToolCall[]>(),
  context: Annotation<Record<string, unknown>>(),
  tenantId: Annotation<number>(),
  agentConfig: Annotation<AgentLLMConfig>(),
});
```

### Invocation Flow
```
POST /agents/[slug]/invoke
  → Load agent definition by slug
  → Merge allowed param overrides from request
  → Create/resume session
  → Resolve tools via Tool Wrapper (filtered by toolBindings)
  → Build or retrieve compiled graph
  → Execute graph (stream or batch)
  → Record execution (tokens, latency, tools used, status)
  → Stream response via SSE OR return complete response
```

## Database (see `database.md`)

6 tables:

**`agents`** — Agent definitions
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenantId | integer (nullable) | Global agents have null tenantId |
| name | varchar(255) | |
| slug | varchar(128) UNIQUE | |
| description | text | |
| llmConfig | jsonb | { provider, model, temperature, maxTokens, topP, ... } |
| systemPrompt | text | Base instructions |
| exposedParams | jsonb | Array of overridable param names |
| toolBindings | jsonb | Array of tool identifiers (module.action format) |
| inputConfig | jsonb | Accepted modalities: { text: true, image: true, audio: false } |
| workflowAgentId | integer (nullable) | FK to agent_workflows (plain int) |
| metadata | jsonb | |
| enabled | boolean, default true | |
| version | integer, default 1 | |
| createdAt, updatedAt | timestamp | |

**`agent_versions`** — Snapshots on definition change

**`agent_node_definitions`** — Reusable node library
| Column | Notes |
|--------|-------|
| category | 'llm', 'tool', 'condition', 'transform', 'human-in-the-loop', 'memory' |
| inputs | jsonb — parameter declarations |
| outputs | jsonb — output declarations |
| config | jsonb — default config |
| isSystem | boolean — system nodes can't be deleted |

**`agent_sessions`** — Conversation sessions (tenantId, agentId, userId, title, context, status, isPlayground)

**`agent_messages`** — Parts-based messages (role, content jsonb [{type: 'text', text: '...'}, {type: 'image', url: '...'}], toolCalls, toolResults, metadata)

**`agent_executions`** — Per-invocation logs (status, llmConfig effective, toolsUsed, tokenUsage {input, output, total}, latencyMs, error)

## API Endpoints (see `api.md`)

20 endpoints:

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | /api/agents | List/create agents |
| GET/PUT/DELETE | /api/agents/[id] | Agent CRUD |
| GET | /api/agents/[id]/versions | Version history |
| POST | /api/agents/[id]/versions/[versionId]/restore | Restore version |
| **POST** | **/api/agents/[slug]/invoke** | **Invoke agent (main endpoint)** |
| GET | /api/agents/tools | Discovered tool catalog |
| GET/POST | /api/agent-nodes | Node library CRUD |
| GET/PUT/DELETE | /api/agent-nodes/[id] | Node CRUD |
| GET/POST | /api/agent-sessions | Session CRUD |
| GET/DELETE | /api/agent-sessions/[id] | Session get/archive |
| GET | /api/agent-sessions/[id]/messages | List messages |
| POST | /api/agent-sessions/[id]/messages | Send message |
| GET | /api/agent-executions | List executions |
| GET | /api/agent-executions/[id] | Execution detail |

**Invoke endpoint** accepts:
```typescript
{
  messages: [{ role: 'user', content: [{ type: 'text', text: '...' }] }],
  params?: { temperature?: 0.2, maxTokens?: 500 },  // only exposedParams accepted
  sessionId?: number,                                 // resume existing session
  stream?: boolean                                    // SSE streaming
}
```

## Events

| Event | Payload |
|-------|---------|
| `agents.agent.created/updated/deleted` | id, name, slug, tenantId |
| `agents.session.created/archived` | id, agentId, userId, tenantId |
| `agents.message.sent` | id, sessionId, role |
| `agents.execution.started` | id, agentId, sessionId |
| `agents.execution.completed` | id, agentId, status, tokenUsage, latencyMs |
| `agents.execution.failed` | id, agentId, error |
| `agents.tool.invoked` | executionId, toolName, moduleSlug, status |
| `agents.node.created/updated/deleted` | id, name, category |

## Seed Data

1. Permissions: `agents.read/create/update/delete/invoke`, `agent-nodes.*`, `agent-sessions.read/create`, `agent-executions.read`
2. Built-in node definitions (isSystem=true): LLM, Tool Executor, Condition, Transform, Human Review, Memory
3. Optional: default dental FAQ agent definition (model: fast, tools: [kb.search], system prompt in Spanish)

## Config Schema

| Key | Type | Default | Instance-Scoped |
|-----|------|---------|:---:|
| `MAX_TOOL_BINDINGS_PER_AGENT` | number | 50 | Yes |
| `DEFAULT_MAX_TOKENS` | number | 4096 | Yes |
| `EXECUTION_TIMEOUT_MS` | number | 120000 | No |
| `TOOL_WRAPPER_REFRESH_INTERVAL` | number | 60 | No |
| `MAX_TOOL_ITERATIONS` | number | 10 | Yes |
| `STREAMING_ENABLED` | boolean | true | No |

## Chat Block

```typescript
chat: {
  description: 'Agent management — define, configure, invoke AI agents with tool bindings and streaming',
  capabilities: ['create agents', 'invoke agents', 'manage node definitions', 'list available tools'],
  actionSchemas: [
    { name: 'agents.invoke', endpoint: { method: 'POST', path: 'agents/[slug]/invoke' }, ... },
    { name: 'agents.list', endpoint: { method: 'GET', path: 'agents' }, ... },
    { name: 'agents.listTools', endpoint: { method: 'GET', path: 'agents/tools' }, ... },
  ]
}
```

## Dashboard UI (see `UI.md`)

15 component files in `apps/dashboard/src/components/agents/`:
- AgentList, AgentCreate (tabbed), AgentEdit, AgentShow
- AgentNodeList, AgentNodeCreate, AgentNodeEdit
- SessionList, SessionShow (chat bubble layout)
- ExecutionList, ExecutionShow (timeline view)
- SystemPromptEditor (with variable autocomplete)
- ToolBindingsEditor (multi-select checklist)
- ExposedParamsEditor (checkbox list)

Menu section: `──── Agents ────` with Agents, Node Definitions, Sessions, Executions

## Security (see `secure.md`)

- Tool Wrapper respects user permissions — agents can't call endpoints the user lacks access to
- Exposed params validation: only declared params accepted, others silently ignored
- System prompt injection defense in guardrails
- Session isolation: users see only their own sessions (admins see all)
- Rate limiting on invoke endpoint (configurable per agent)
- Max token cap per invocation (safety limit)
- Full audit trail in agent_executions

## Test Plan (TDD)

1. `tool-wrapper.test.ts` — discovery from registry, schema generation, permission filtering
2. `agent-invoker.test.ts` — load agent, merge params, execute, record, stream
3. `graph-builder.test.ts` — build graph from config, compile, validate edges
4. `node-lifecycle.test.ts` — init, validate, execute, cleanup hooks
5. `streaming.test.ts` — SSE format, token events, tool call events, completion
6. `message-handler.test.ts` — parts-based content, multimodal, validation
7. `session-manager.test.ts` — create, resume, archive, context accumulation
8. `api/agents.test.ts` — CRUD, version history, restore
9. `api/invoke.test.ts` — invocation, streaming, param override, quota check

## File Structure

```
packages/module-agent-core/
  package.json
  tsconfig.json
  src/
    index.ts                        ← ModuleDefinition export
    schema.ts                       ← 6 Drizzle tables
    types.ts                        ← TypeScript interfaces
    seed.ts                         ← Permissions + built-in nodes + optional default agent
    engine/
      tool-wrapper.ts               ← Auto-discover module APIs as tools
      agent-invoker.ts              ← Unified invocation orchestrator
      message-handler.ts            ← Parts-based message processing
      streaming.ts                  ← SSE adapter
      session-manager.ts            ← Session create/resume/archive
      execution-tracker.ts          ← Per-invocation logging
    langgraph/
      graph-builder.ts              ← Fluent API → StateGraph
      state.ts                      ← AgentState Annotation
      checkpointer.ts               ← PostgreSQL checkpointer
      nodes/
        llm-node.ts                 ← Language model invocation
        tool-executor-node.ts       ← Tool call execution
        condition-node.ts           ← Branch on state
        transform-node.ts           ← Reshape data
        human-review-node.ts        ← Pause for approval
        memory-node.ts              ← Read/write memory
        prompt-assembly-node.ts     ← Dynamic prompt from template
      routing.ts                    ← Conditional edge functions
      lifecycle.ts                  ← Node lifecycle base class + decorators
    api/
      agents.handler.ts
      agents-by-id.handler.ts
      agents-invoke.handler.ts      ← THE main invocation endpoint
      agents-versions.handler.ts
      agents-versions-restore.handler.ts
      agents-tools.handler.ts
      agent-nodes.handler.ts
      agent-nodes-by-id.handler.ts
      agent-sessions.handler.ts
      agent-sessions-by-id.handler.ts
      agent-sessions-messages.handler.ts
      agent-executions.handler.ts
      agent-executions-by-id.handler.ts
```
