# Module: Chat

> **Package**: `packages/module-chat/`
> **Name**: `@oven/module-chat`
> **Dependencies**: `module-registry`, `module-agent-core`, `module-ai`
> **Status**: Planned

---

## 1. Overview

Chat is the **user-facing conversational interface** to the entire OVEN platform. It provides a natural language layer where users can ask questions, perform actions, and orchestrate multi-step operations across all registered modules — all through conversation.

Chat is **not** the reasoning engine itself. Instead, it delegates reasoning to `module-agent-core` agents. The Chat module's responsibility is the **conversational experience**: session management, message rendering, the chat UI, the sidebar panel, and the bridge between the user's natural language and the agent system that fulfills their intent.

### Architectural Role

The agent architecture is split into three layers:

1. **module-chat** (this module) — The conversational **surface**. Manages chat sessions, message history, UI components, and the user-facing API. When a user sends a message, Chat forwards it to its backing agent for reasoning.
2. **module-agent-core** — The agent **management** layer. Defines agents, their configurations, tool bindings, and the unified invocation endpoint. Chat delegates to a configured agent for reasoning.
3. **module-workflow-agents** — The agent **orchestration** layer. Provides graph-based multi-step reasoning flows. Complex agents use workflow graphs for their reasoning process.

### Key Principles

- **Loose coupling** — Chat never imports module code directly. It discovers modules through the registry and delegates reasoning to agents
- **Agent-backed** — Every Chat session is backed by a configured agent (from `module-agent-core`). The default platform agent discovers all modules via the registry, but administrators can assign different agents to different chat contexts
- **Registry discovery** — When a user asks "What can you do?", Chat's backing agent reads module descriptions and capabilities from `registry.getAll()` and its `chat` blocks to answer. When a new module is registered, the agent automatically learns about it
- **Permission-scoped** — All actions executed through Chat respect the invoking user's permissions and RLS policies

---

## 2. Core Concepts

### Module Self-Description (Registry Discovery)

Each module can optionally declare its chat capabilities in the ModuleDefinition:

- **description**: What the module does (human-readable)
- **capabilities**: Array of high-level things the module can do (e.g., "create workflows", "manage roles", "score exams")
- **actionSchemas**: Structured definitions of available actions — name, parameters, return type, required permissions. These follow a function-calling schema format.

When the Chat module's backing agent needs to fulfill a user request, it:
1. Queries `registry.getAll()` for all registered modules
2. Reads each module's `chat` block for descriptions, capabilities, and action schemas
3. Also reads `apiHandlers` for any endpoints not covered by explicit action schemas
4. Presents these as available tools to the LLM during reasoning
5. The LLM selects the appropriate tool(s) and the agent's Tool Wrapper (from `module-agent-core`) executes them

This means discovery is **automatic and continuous**. When `module-exams` registers, the Chat agent can immediately create exams, list attempts, and query scores — without any Chat module changes.

### Backing Agent Configuration

Chat delegates all reasoning to a configured agent from `module-agent-core`. The platform ships with a **default chat agent** that:

- Has a system prompt optimized for platform assistance ("You are a helpful assistant for the OVEN platform...")
- Has tool bindings set to `["*"]` (all discovered module endpoints)
- Uses the Tool Wrapper to automatically resolve any module API endpoint as a callable tool
- Supports multimodal input (text, images, audio)

Administrators can:
- Customize the default chat agent's behavior (system prompt, model, temperature)
- Assign different agents to different chat contexts (e.g., a specialized "Exam Helper" agent for the exams section of the dashboard)
- Create role-scoped chat agents that only have access to certain modules' tools

### Conversation Memory

Chat sessions maintain context across turns:
- **Short-term memory** — The message history within a session provides conversational context
- **Long-term memory** — If the backing agent has memory enabled (via `module-workflow-agents`), it can recall facts and preferences from prior sessions
- **Entity tracking** — The session's `context` JSONB field accumulates referenced entities (e.g., "Exam A", "the Math flow") so the agent can resolve pronouns and references in follow-up messages

---

## 3. Discovery Flow

```
User sends message via Chat UI
    ↓
Chat module creates/continues session
    ↓
Forwards message to backing agent (module-agent-core invoke)
    ↓
Agent's Tool Wrapper queries registry.getAll()
    ↓
Discovers module descriptions + actionSchemas + apiHandlers
    ↓
LLM reasons: maps user intent → tool calls
    ↓
Tool Wrapper executes calls (respecting user permissions via module-roles)
    ↓
Agent returns response → Chat stores message and renders to user
```

When a new module is registered (e.g., `module-exams`), the backing agent discovers it through the registry on the next invocation and can immediately interact with its declared actions. No coupling, no hardcoded references.

---

## 4. Capabilities

### What Chat Can Do
- **Query**: "How many exams were submitted this week?" → agent calls exams API
- **Create**: "Create a new workflow with three steps" → agent calls workflow creation API
- **Modify**: "Add question 5 to Exam A" → agent calls exam-questions API
- **Analyze**: "Show me the average score for Exam B" → agent queries scoring API + formats result
- **Navigate**: "Take me to the RLS policy editor" → agent returns a navigation action
- **Explain**: "What does the Forms module do?" → agent reads module description from registry
- **Multi-Step**: "Create an exam from questions tagged 'algebra', assign it to the Math flow, and notify reviewers" → agent chains multiple module actions via its workflow graph
- **Multimodal**: "What's in this image?" → agent processes attached image through vision-capable LLM
- **Agent Selection**: "Use the Exam Helper agent" → Chat switches to a different backing agent for the session

### What Chat Cannot Do
- Access data the current user doesn't have permission for
- Execute actions outside of declared module actionSchemas or registered API endpoints
- Modify system configuration or infrastructure
- Bypass RLS policies or role restrictions

---

## 4A. Command System

### Inspired by Claude Code's command system

Chat supports `/slash` commands that provide quick actions without LLM reasoning.

**Command Interface**:
```typescript
interface ChatCommand {
  name: string;
  slug: string;
  description: string;
  category: 'navigation' | 'agent' | 'tools' | 'export' | 'settings';
  parameters?: JsonSchema;
  permissions?: string[];
  execute: (args: CommandArgs, context: ChatContext) => Promise<CommandResult>;
}

interface CommandResult {
  type: 'message' | 'action' | 'redirect';
  content?: string;
  data?: unknown;
  systemMessage?: string;
}
```

**Built-in Commands** (15):
| Command | Description | Category |
|---------|-------------|----------|
| `/help` | List available commands | navigation |
| `/clear` | Clear conversation | navigation |
| `/agent <slug>` | Switch backing agent | agent |
| `/tools` | List available tools | tools |
| `/search <query>` | Search KB directly | tools |
| `/mode <mode>` | Set creative/precise/balanced | settings |
| `/export [format]` | Export conversation (json/md/txt) | export |
| `/status` | Show session stats (tokens, cost) | navigation |
| `/feedback` | Submit session feedback | navigation |
| `/reset` | Reset session context | navigation |
| `/model <alias>` | Override model for session | settings |
| `/temperature <n>` | Override temperature | settings |
| `/skill <name>` | Invoke a skill | tools |
| `/mcp` | List connected MCP servers | tools |
| `/pin` | Pin/unpin current session | navigation |

**Command Resolution**: When a message starts with `/`, the command registry intercepts it before it reaches the agent. The command executes locally and returns a result message. Custom commands can be registered per-tenant via the `chat_commands` table.

---

## 4B. Skill System

### Inspired by Claude Code's skill system

Skills are reusable prompt templates that enhance the agent's capabilities.

**Skill Interface**:
```typescript
interface ChatSkill {
  name: string;
  slug: string;
  description: string;
  whenToUse: string;
  promptTemplate: string;
  allowedTools?: string[];
  parameters?: JsonSchema;
  source: 'builtin' | 'custom' | 'mcp' | 'plugin';
}
```

**Built-in Skills** (6):
| Skill | Description | When To Use |
|-------|-------------|-------------|
| `summarize` | Summarize conversation or document | When user asks to summarize |
| `translate` | Translate content between languages | When user asks to translate |
| `extract` | Extract structured data from text | When user asks to extract data |
| `analyze` | Analyze data, generate insights | When user provides data for analysis |
| `faq-create` | Create KB entry from conversation | When user wants to save Q&A to KB |
| `report` | Generate formatted report | When user asks for a report |

**Skill Loading Pipeline**:
1. Load built-in skills from `skills/builtin/`
2. Load custom skills from `chat_skills` table (per-tenant)
3. Load MCP-provided skills from connected MCP servers
4. Merge and deduplicate by slug
5. Inject skill descriptions into system prompt for auto-selection

**Auto-invocation**: Skills include a `whenToUse` field that is included in the system prompt. The LLM can automatically select the right skill based on user intent without the user typing `/skill`.

---

## 4C. Hook System

### Inspired by Claude Code's hook system

Hooks allow extending chat behavior at key lifecycle points.

**Hook Events**:
| Event | When | Can Modify |
|-------|------|-----------|
| `pre-message` | Before processing user message | message content, abort |
| `post-message` | After generating response | response content |
| `pre-tool-use` | Before executing a tool | tool params, approve/block |
| `post-tool-use` | After tool execution | tool result |
| `on-error` | When an error occurs | error handling, retry |
| `on-escalation` | When agent escalates to human | escalation routing |
| `session-start` | When new session created | initial context |
| `session-end` | When session archived | cleanup actions |

**Hook Handler Types**:
```typescript
type HookHandler =
  | { type: 'condition'; expression: string; action: 'approve' | 'block' | 'modify' }
  | { type: 'api'; endpoint: string; method: string; transform?: string }
  | { type: 'event'; eventName: string; payload?: Record<string, string> }
  | { type: 'guardrail'; guardrailId: number }
```

**Execution Order**: Hooks execute in priority order (lower number = higher priority). Multiple hooks on the same event run sequentially. If any hook returns `abort: true`, processing stops.

**Use Cases**:
- **Content moderation**: `pre-message` hook with `guardrail` handler to filter input before it reaches the agent
- **Audit logging**: `post-message` hook with `api` handler that posts to an external audit service
- **Tool approval**: `pre-tool-use` hook with `condition` handler that blocks certain tools for certain tenants
- **Escalation routing**: `on-escalation` hook with `event` handler that notifies the on-call team

---

## 4D. MCP Integration

### Inspired by Claude Code's MCP system

Chat supports connecting to external MCP (Model Context Protocol) servers, enabling agents to use tools from external AI systems.

**Supported Transports**:
| Transport | Use Case |
|-----------|----------|
| `stdio` | Local command-line MCP servers |
| `sse` | Remote HTTP servers with Server-Sent Events |
| `http` | Standard HTTP-based MCP servers |
| `ws` | WebSocket-based real-time MCP servers |

**MCP Connection Config**:
```typescript
interface MCPConnectionConfig {
  stdio?: { command: string; args?: string[]; env?: Record<string, string> };
  sse?: { url: string; headers?: Record<string, string> };
  http?: { url: string; headers?: Record<string, string> };
  ws?: { url: string };
}
```

**Tool Discovery**: When an MCP server is connected, the system:
1. Queries the server for available tools
2. Caches tool definitions in `chat_mcp_connections.toolDefinitions`
3. Bridges MCP tools into the agent's tool catalog
4. Agent can invoke MCP tools during reasoning (proxied through chat module)
5. Tool results flow back through the normal execution pipeline

**MCP Endpoints**:
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/chat-mcp-servers` | List MCP connections |
| POST | `/api/chat-mcp-servers` | Add MCP server |
| DELETE | `/api/chat-mcp-servers/[id]` | Remove MCP server |
| POST | `/api/chat-mcp-servers/[id]/connect` | Connect to server |
| POST | `/api/chat-mcp-servers/[id]/disconnect` | Disconnect |
| GET | `/api/chat-mcp-servers/[id]/tools` | List discovered tools |

---

## 4E. Prompt Engineering

### Inspired by Claude Code's system prompt construction

Chat uses a dynamic prompt builder that assembles the system prompt from multiple sections with a caching strategy.

**Prompt Sections**:
```typescript
async function buildSystemPrompt(session: ChatSession, agent: Agent): Promise<string[]> {
  return [
    // --- CACHED SECTIONS (stable across turns) ---
    agent.systemPrompt,                      // 1. Base agent instructions
    await getTenantContext(session.tenantId), // 2. Tenant config (hours, tone, schedule)
    formatCommandDescriptions(commands),      // 3. Available /commands
    formatSkillDescriptions(skills),          // 4. Available skills
    formatMCPCapabilities(mcpConnections),    // 5. MCP server capabilities
    // --- DYNAMIC BOUNDARY ---
    formatToolDescriptions(tools),            // 6. Available tools (may change per turn)
    await getRelevantKBContext(session),      // 7. KB context (query-dependent)
    formatSessionContext(session.context),    // 8. Session memory
    await getHookInstructions(session),       // 9. Hook-injected instructions
  ].filter(Boolean);
}
```

**Caching Strategy**:
- Sections 1-5 are stable across turns — cached at session level
- Sections 6-9 are dynamic — recomputed per turn
- Reduces prompt token cost by ~40-60%

**Context Accumulation**: The session's `context` JSONB field accumulates:
- Referenced entities (e.g., "Exam A", "the dental clinic")
- User preferences detected during conversation
- Key facts from prior turns
- Active filters or scopes

---

## 5. Database Schema

### Tables

**`chat_sessions`** — Conversation sessions
- `id` (serial, PK)
- `userId` (integer) — who initiated the session
- `agentId` (integer, nullable) — which agent backs this session (FK concept to agents table). If null, uses the default platform agent
- `title` (varchar, nullable) — auto-generated or user-set
- `context` (JSONB) — accumulated session context (referenced entities, prior intents)
- `status` (varchar) — active, archived
- `sessionToken` (varchar, nullable) — for anonymous widget sessions
- `isAnonymous` (boolean, default false)
- `isPinned` (boolean, default false)
- `settings` (JSONB, nullable) — per-session settings overrides
- `createdAt`, `updatedAt` (timestamps)

**`chat_messages`** — Individual messages in a session
- `id` (serial, PK)
- `sessionId` (integer, FK -> chat_sessions)
- `role` (varchar) — user, assistant, system, tool
- `content` (JSONB) — parts-based content (text, image references, audio references) to support multimodal messages
- `toolCalls` (JSONB, nullable) — tool calls the agent made in this response
- `toolResults` (JSONB, nullable) — tool execution results
- `metadata` (JSONB) — model used, tokens consumed, latency, cost
- `feedbackState` (varchar, nullable) — liked, disliked, null
- `checkpointId` (varchar, nullable) — for conversation branching
- `createdAt` (timestamp)

**`chat_actions`** — Actions executed by the agent (denormalized view of tool calls for easy querying)
- `id` (serial, PK)
- `messageId` (integer, FK -> chat_messages)
- `moduleSlug` (varchar) — which module was called
- `actionName` (varchar) — which action was invoked
- `input` (JSONB) — parameters sent
- `output` (JSONB) — result received
- `status` (varchar) — success, error
- `executedAt` (timestamp)

**`chat_commands`** — Registered /slash commands
- `id` (serial, PK)
- `tenantId` (integer, nullable) — null = platform-wide
- `name` (varchar) — display name
- `slug` (varchar, unique) — command identifier
- `description` (text)
- `category` (varchar) — navigation, agent, tools, export, settings
- `handler` (varchar) — module + function reference
- `parameters` (JSONB) — JSON Schema for args
- `permissions` (JSONB) — required permission slugs
- `isSystem` (boolean, default false)
- `enabled` (boolean, default true)
- `createdAt`, `updatedAt` (timestamps)

**`chat_skills`** — Loadable skill definitions
- `id` (serial, PK)
- `tenantId` (integer, nullable) — null = platform-wide
- `name` (varchar)
- `slug` (varchar, unique)
- `description` (text)
- `whenToUse` (text) — LLM instruction for auto-invocation
- `promptTemplate` (text) — Handlebars template
- `allowedTools` (JSONB) — tool subset this skill can use
- `parameters` (JSONB) — configurable params
- `source` (varchar) — builtin, custom, mcp, plugin
- `enabled` (boolean, default true)
- `metadata` (JSONB)
- `createdAt`, `updatedAt` (timestamps)

**`chat_hooks`** — Lifecycle hook definitions
- `id` (serial, PK)
- `tenantId` (integer, nullable) — null = platform-wide
- `event` (varchar) — pre-message, post-message, pre-tool-use, etc.
- `name` (varchar)
- `description` (text)
- `handler` (JSONB) — { type, config }
- `priority` (integer, default 100) — execution order
- `enabled` (boolean, default true)
- `createdAt`, `updatedAt` (timestamps)

**`chat_mcp_connections`** — MCP server connections per tenant
- `id` (serial, PK)
- `tenantId` (integer, nullable)
- `name` (varchar)
- `slug` (varchar, unique)
- `transport` (varchar) — stdio, sse, http, ws
- `config` (JSONB) — connection config (encrypted sensitive fields)
- `toolDefinitions` (JSONB) — cached discovered tools
- `status` (varchar) — connected, disconnected, error
- `lastConnectedAt` (timestamp, nullable)
- `enabled` (boolean, default true)
- `createdAt`, `updatedAt` (timestamps)

**`chat_feedback`** — Message feedback for quality tracking
- `id` (serial, PK)
- `messageId` (integer)
- `sessionId` (integer)
- `userId` (integer)
- `isHelpful` (boolean)
- `feedbackType` (varchar) — accuracy, relevance, completeness, tone
- `comment` (text, nullable)
- `createdAt` (timestamp)

---

## 6. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/chat/sessions` | List chat sessions for current user |
| POST | `/api/chat/sessions` | Create a new chat session (optionally with a specific agent) |
| GET | `/api/chat/sessions/[id]` | Get a session with recent messages |
| DELETE | `/api/chat/sessions/[id]` | Archive a session |
| GET | `/api/chat/sessions/[id]/messages` | List messages in a session (paginated) |
| POST | `/api/chat/sessions/[id]/messages` | Send a message (triggers agent reasoning, returns response) |
| GET | `/api/chat/sessions/[id]/actions` | List actions executed in a session |
| GET | `/api/chat/capabilities` | List all discovered module capabilities (from registry) |
| GET | `/api/chat/agents` | List available agents that can back a chat session |
| PUT | `/api/chat/sessions/[id]/agent` | Change the backing agent for a session |
| PUT | `/api/chat/sessions/[id]/pin` | Pin/unpin a session |
| POST | `/api/chat/sessions/[id]/export` | Export session (json/md/txt) |
| POST | `/api/chat/sessions/[id]/feedback` | Submit feedback for a message |
| GET | `/api/chat/commands` | List available commands |
| POST | `/api/chat/commands` | Register a custom command |
| PUT | `/api/chat/commands/[id]` | Update a command |
| DELETE | `/api/chat/commands/[id]` | Remove a custom command |
| GET | `/api/chat/skills` | List available skills |
| POST | `/api/chat/skills` | Register a custom skill |
| PUT | `/api/chat/skills/[id]` | Update a skill |
| DELETE | `/api/chat/skills/[id]` | Remove a custom skill |
| GET | `/api/chat/hooks` | List hook definitions |
| POST | `/api/chat/hooks` | Create a hook |
| PUT | `/api/chat/hooks/[id]` | Update a hook |
| DELETE | `/api/chat/hooks/[id]` | Remove a hook |
| GET | `/api/chat/mcp-servers` | List MCP connections |
| POST | `/api/chat/mcp-servers` | Add MCP server |
| DELETE | `/api/chat/mcp-servers/[id]` | Remove MCP server |
| POST | `/api/chat/mcp-servers/[id]/connect` | Connect to MCP server |
| POST | `/api/chat/mcp-servers/[id]/disconnect` | Disconnect MCP server |
| GET | `/api/chat/mcp-servers/[id]/tools` | List discovered MCP tools |
| GET | `/api/chat/feedback` | List feedback entries (filterable) |

### Message Endpoint Behavior (`POST /api/chat/sessions/[id]/messages`)

When a user sends a message:

1. The message is stored in `chat_messages` with role `user`
2. The session's message history is assembled
3. The backing agent is invoked via `module-agent-core`'s invoke endpoint, passing the message history and any multimodal attachments
4. The agent reasons, potentially making tool calls (recorded in `chat_actions`)
5. The agent's response is stored as a new `chat_messages` entry with role `assistant`
6. If `stream: true` is requested, the response is streamed via SSE as tokens arrive
7. The session's `context` is updated with any new entity references

---

## 7. Dashboard UI

### Custom Pages
- **Chat Interface** (`/chat`) — Full-page conversational UI with:
  - Message history with rich formatting
  - Action cards showing what tools the agent invoked and their results
  - Quick-action suggestions based on available capabilities
  - Agent selector to switch between available backing agents
  - Multimodal input: text field, image upload, audio upload
  - Streaming response display
- **Chat Sidebar** — Collapsible chat panel accessible from any page in the dashboard. Provides the same conversational capability in a compact form factor.

### AI SDK React Integration

The Chat frontend is built on `@ai-sdk/react` hooks, powered by `module-ai`'s server-side streaming endpoints:

- **`useChat`** from `@ai-sdk/react` — The primary hook for the chat interface. Manages the full conversation lifecycle:
  - Transport: `DefaultChatTransport({ api: '/api/ai/stream', headers: authHeaders })` — connects to Module AI's streaming endpoint
  - Message format: `UIMessage` with `parts` array (text, tool-invocation, reasoning, source-url, file)
  - Status tracking: `submitted` → `streaming` → `ready` — drives the typing indicator and input locking
  - Tool call rendering: `tool-invocation` parts include `toolName`, `input`, `output`, and `state` for rendering action cards
  - Streaming throttle: `experimental_throttle` prevents excessive re-renders during fast token streams
  - Multi-modal input: user messages include `file` parts for images and documents
  - `stop()` function for aborting in-progress generations
  - `regenerate()` function for retrying the last assistant response

- **`useObject`** from `@ai-sdk/react` — Used for structured AI responses (e.g., when the agent returns a data card, table, or form suggestion). Streams a deeply-partial typed object validated against a Zod schema.

- **`useCompletion`** from `@ai-sdk/react` — Used for the search/command bar and inline suggestions within the chat interface.

All hooks connect to Module AI's endpoints, which handle provider resolution, middleware (usage tracking, rate limiting), and permission enforcement. The Chat module never calls LLM providers directly.

### Menu Section
```
──── Chat ────
Chat
```

---

## 8. ModuleDefinition Extension

To support chat discovery, the `ModuleDefinition` interface is extended with optional fields. This extension is shared across `module-chat`, `module-agent-core`, and `module-workflow-agents` — any module that reads the `chat` block benefits:

The `chat` block is a self-description contract. It tells agents (whether invoked through Chat, through the agent API, or through a workflow) what a module can do and how to interact with it:

- **description** — Human-readable summary of the module's purpose
- **capabilities** — Array of high-level action descriptions (used by the LLM for capability understanding)
- **actionSchemas** — Structured definitions of available actions:
  - **name** — Action identifier
  - **description** — What this action does
  - **parameters** — JSON Schema describing the input
  - **returns** — JSON Schema describing the output
  - **requiredPermissions** — Permission slugs needed to call this action
  - **endpoint** — The HTTP method and path that implements this action

Modules that don't declare a `chat` block are still discoverable through their `apiHandlers` (the Tool Wrapper can auto-generate basic tool descriptions from route patterns), but the `chat` block provides richer, LLM-optimized descriptions that improve tool selection accuracy.

---

## 9. Events

| Event | Payload |
|-------|---------|
| `chat.session.created` | id, userId, agentId |
| `chat.session.archived` | id, userId |
| `chat.session.agent-changed` | id, previousAgentId, newAgentId |
| `chat.message.sent` | id, sessionId, role |
| `chat.action.executed` | id, sessionId, moduleSlug, actionName, status |
| `chat.command.executed` | id, sessionId, commandSlug, args |
| `chat.skill.invoked` | id, sessionId, skillSlug |
| `chat.hook.triggered` | id, sessionId, event, hookName |
| `chat.mcp.connected` | id, tenantId, serverSlug |
| `chat.mcp.disconnected` | id, tenantId, serverSlug |
| `chat.feedback.submitted` | id, messageId, sessionId, isHelpful |

---

## 10. Integration Points

| Module | Integration |
|--------|-------------|
| **module-agent-core** | Delegates all reasoning to a configured agent. Uses the agent invoke endpoint to send messages and receive responses. Agents provide the Tool Wrapper, LLM reasoning, and multimodal support. |
| **module-workflow-agents** | Complex backing agents use workflow graphs for multi-step reasoning. Chat is unaware of this — it simply invokes the agent and receives a response. |
| **module-ai** | Chat's frontend uses `@ai-sdk/react` hooks (`useChat`, `useObject`, `useCompletion`) connected to Module AI's streaming endpoints. All LLM calls, tool executions, and AI features go through Module AI's provider registry and middleware stack. |
| **module-registry** | Discovery source for module capabilities. The backing agent reads `registry.getAll()` and `chat` blocks to understand what tools are available. Chat itself reads the registry for the `/api/chat/capabilities` endpoint. |
| **module-roles** | All tool invocations respect the user's permissions. The backing agent never bypasses RLS or role restrictions. |
| **All other modules** | Interacts via the agent's Tool Wrapper and declared `actionSchemas` — fully loosely coupled. |

---

## Module Rules Compliance

> Added per [`module-rules.md`](../module-rules.md) — 7 required items.

### A. Schema Updates — tenantId + Indexes

```typescript
// chat_sessions
tenantId: integer('tenant_id'),  // nullable — platform-wide sessions have no tenant
sessionToken: varchar('session_token'),
isAnonymous: boolean('is_anonymous').default(false),
isPinned: boolean('is_pinned').default(false),
settings: jsonb('settings'),
}, (table) => [
  index('cs_tenant_id_idx').on(table.tenantId),
  index('cs_user_id_idx').on(table.userId),
  index('cs_agent_id_idx').on(table.agentId),
  index('cs_status_idx').on(table.status),
  index('cs_session_token_idx').on(table.sessionToken),
  index('cs_is_pinned_idx').on(table.isPinned),
]);

// chat_messages
feedbackState: varchar('feedback_state'),
checkpointId: varchar('checkpoint_id'),
}, (table) => [
  index('cm_session_id_idx').on(table.sessionId),
  index('cm_role_idx').on(table.role),
  index('cm_checkpoint_id_idx').on(table.checkpointId),
]);

// chat_actions
}, (table) => [
  index('ca_message_id_idx').on(table.messageId),
  index('ca_module_slug_idx').on(table.moduleSlug),
  index('ca_status_idx').on(table.status),
]);

// chat_commands
tenantId: integer('tenant_id'),
}, (table) => [
  index('cc_tenant_id_idx').on(table.tenantId),
  index('cc_slug_idx').on(table.slug),
  index('cc_category_idx').on(table.category),
]);

// chat_skills
tenantId: integer('tenant_id'),
}, (table) => [
  index('csk_tenant_id_idx').on(table.tenantId),
  index('csk_slug_idx').on(table.slug),
  index('csk_source_idx').on(table.source),
]);

// chat_hooks
tenantId: integer('tenant_id'),
}, (table) => [
  index('ch_tenant_id_idx').on(table.tenantId),
  index('ch_event_idx').on(table.event),
  index('ch_priority_idx').on(table.priority),
]);

// chat_mcp_connections
tenantId: integer('tenant_id'),
}, (table) => [
  index('cmc_tenant_id_idx').on(table.tenantId),
  index('cmc_slug_idx').on(table.slug),
  index('cmc_status_idx').on(table.status),
]);

// chat_feedback
}, (table) => [
  index('cf_message_id_idx').on(table.messageId),
  index('cf_session_id_idx').on(table.sessionId),
  index('cf_user_id_idx').on(table.userId),
]);
```

### B. Chat Block

```typescript
chat: {
  description: 'User-facing conversational interface to the OVEN platform. Manages chat sessions, message history, and delegates reasoning to backing agents.',
  capabilities: ['create chat sessions', 'send messages', 'list sessions', 'view action history', 'switch backing agent'],
  actionSchemas: [
    {
      name: 'chat.listSessions',
      description: 'List chat sessions for the current user',
      parameters: { tenantId: { type: 'number' }, status: { type: 'string' } },
      returns: { data: { type: 'array' }, total: { type: 'number' } },
      requiredPermissions: ['chat-sessions.read'],
      endpoint: { method: 'GET', path: 'chat/sessions' },
    },
    {
      name: 'chat.sendMessage',
      description: 'Send a message to a chat session (triggers agent reasoning)',
      parameters: { sessionId: { type: 'number', required: true }, content: { type: 'string', required: true } },
      requiredPermissions: ['chat-messages.create'],
      endpoint: { method: 'POST', path: 'chat/sessions/[id]/messages' },
    },
    {
      name: 'chat.listCapabilities',
      description: 'List all discovered module capabilities from the registry',
      parameters: {},
      requiredPermissions: ['chat-sessions.read'],
      endpoint: { method: 'GET', path: 'chat/capabilities' },
    },
  ],
},
```

### C. configSchema

```typescript
configSchema: [
  { key: 'MAX_MESSAGES_PER_SESSION', type: 'number', description: 'Maximum messages per chat session', defaultValue: 500, instanceScoped: true },
  { key: 'DEFAULT_AGENT_SLUG', type: 'string', description: 'Default backing agent slug for new sessions', defaultValue: 'platform-assistant', instanceScoped: true },
  { key: 'ENABLE_CHAT_SIDEBAR', type: 'boolean', description: 'Show collapsible chat sidebar on all pages', defaultValue: true, instanceScoped: false },
  { key: 'ENABLE_COMMANDS', type: 'boolean', description: 'Enable /slash commands', defaultValue: true, instanceScoped: false },
  { key: 'ENABLE_SKILLS', type: 'boolean', description: 'Enable skill system', defaultValue: true, instanceScoped: false },
  { key: 'ENABLE_HOOKS', type: 'boolean', description: 'Enable hook system', defaultValue: true, instanceScoped: false },
  { key: 'ENABLE_MCP', type: 'boolean', description: 'Enable MCP integration', defaultValue: false, instanceScoped: false },
  { key: 'MAX_MCP_CONNECTIONS', type: 'number', description: 'Max MCP servers per tenant', defaultValue: 5, instanceScoped: true },
  { key: 'COMMAND_PREFIX', type: 'string', description: 'Command prefix character', defaultValue: '/', instanceScoped: false },
],
```

### D. Typed Event Schemas

```typescript
events: {
  schemas: {
    'chat.session.created': {
      id: { type: 'number', required: true }, tenantId: { type: 'number' },
      userId: { type: 'number' }, agentId: { type: 'number' },
    },
    'chat.session.archived': {
      id: { type: 'number', required: true }, userId: { type: 'number' },
    },
    'chat.session.agent-changed': {
      id: { type: 'number', required: true },
      previousAgentId: { type: 'number' }, newAgentId: { type: 'number' },
    },
    'chat.message.sent': {
      id: { type: 'number', required: true }, sessionId: { type: 'number', required: true },
      role: { type: 'string' },
    },
    'chat.action.executed': {
      id: { type: 'number', required: true }, sessionId: { type: 'number', required: true },
      moduleSlug: { type: 'string' }, actionName: { type: 'string' }, status: { type: 'string' },
    },
    'chat.command.executed': {
      id: { type: 'number', required: true }, sessionId: { type: 'number', required: true },
      commandSlug: { type: 'string' }, args: { type: 'object' },
    },
    'chat.skill.invoked': {
      id: { type: 'number', required: true }, sessionId: { type: 'number', required: true },
      skillSlug: { type: 'string' },
    },
    'chat.hook.triggered': {
      id: { type: 'number', required: true }, sessionId: { type: 'number', required: true },
      event: { type: 'string' }, hookName: { type: 'string' },
    },
    'chat.mcp.connected': {
      id: { type: 'number', required: true }, tenantId: { type: 'number' },
      serverSlug: { type: 'string' },
    },
    'chat.mcp.disconnected': {
      id: { type: 'number', required: true }, tenantId: { type: 'number' },
      serverSlug: { type: 'string' },
    },
    'chat.feedback.submitted': {
      id: { type: 'number', required: true }, messageId: { type: 'number', required: true },
      sessionId: { type: 'number', required: true }, isHelpful: { type: 'boolean' },
    },
  },
},
```

### E. Seed Function

```typescript
export async function seedChat(db: any) {
  const modulePermissions = [
    { resource: 'chat-sessions', action: 'read', slug: 'chat-sessions.read', description: 'View chat sessions' },
    { resource: 'chat-sessions', action: 'create', slug: 'chat-sessions.create', description: 'Create chat sessions' },
    { resource: 'chat-sessions', action: 'delete', slug: 'chat-sessions.delete', description: 'Archive chat sessions' },
    { resource: 'chat-messages', action: 'read', slug: 'chat-messages.read', description: 'Read messages' },
    { resource: 'chat-messages', action: 'create', slug: 'chat-messages.create', description: 'Send messages' },
    { resource: 'chat-actions', action: 'read', slug: 'chat-actions.read', description: 'View action history' },
    { resource: 'chat-commands', action: 'read', slug: 'chat-commands.read', description: 'View commands' },
    { resource: 'chat-commands', action: 'create', slug: 'chat-commands.create', description: 'Register custom commands' },
    { resource: 'chat-skills', action: 'read', slug: 'chat-skills.read', description: 'View skills' },
    { resource: 'chat-skills', action: 'create', slug: 'chat-skills.create', description: 'Register custom skills' },
    { resource: 'chat-hooks', action: 'read', slug: 'chat-hooks.read', description: 'View hooks' },
    { resource: 'chat-hooks', action: 'create', slug: 'chat-hooks.create', description: 'Create hooks' },
    { resource: 'chat-mcp', action: 'read', slug: 'chat-mcp.read', description: 'View MCP connections' },
    { resource: 'chat-mcp', action: 'create', slug: 'chat-mcp.create', description: 'Manage MCP connections' },
    { resource: 'chat-feedback', action: 'create', slug: 'chat-feedback.create', description: 'Submit feedback' },
  ];
  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Seed built-in commands
  const builtinCommands = [
    { slug: 'help', name: 'Help', description: 'List available commands', category: 'navigation', handler: 'chat/commands/help', isSystem: true },
    { slug: 'clear', name: 'Clear', description: 'Clear conversation', category: 'navigation', handler: 'chat/commands/clear', isSystem: true },
    { slug: 'agent', name: 'Agent', description: 'Switch backing agent', category: 'agent', handler: 'chat/commands/agent', isSystem: true },
    { slug: 'tools', name: 'Tools', description: 'List available tools', category: 'tools', handler: 'chat/commands/tools', isSystem: true },
    { slug: 'search', name: 'Search', description: 'Search KB directly', category: 'tools', handler: 'chat/commands/search', isSystem: true },
    { slug: 'mode', name: 'Mode', description: 'Set creative/precise/balanced', category: 'settings', handler: 'chat/commands/mode', isSystem: true },
    { slug: 'export', name: 'Export', description: 'Export conversation (json/md/txt)', category: 'export', handler: 'chat/commands/export', isSystem: true },
    { slug: 'status', name: 'Status', description: 'Show session stats (tokens, cost)', category: 'navigation', handler: 'chat/commands/status', isSystem: true },
    { slug: 'feedback', name: 'Feedback', description: 'Submit session feedback', category: 'navigation', handler: 'chat/commands/feedback', isSystem: true },
    { slug: 'reset', name: 'Reset', description: 'Reset session context', category: 'navigation', handler: 'chat/commands/reset', isSystem: true },
    { slug: 'model', name: 'Model', description: 'Override model for session', category: 'settings', handler: 'chat/commands/model', isSystem: true },
    { slug: 'temperature', name: 'Temperature', description: 'Override temperature', category: 'settings', handler: 'chat/commands/temperature', isSystem: true },
    { slug: 'skill', name: 'Skill', description: 'Invoke a skill', category: 'tools', handler: 'chat/commands/skill', isSystem: true },
    { slug: 'mcp', name: 'MCP', description: 'List connected MCP servers', category: 'tools', handler: 'chat/commands/mcp', isSystem: true },
    { slug: 'pin', name: 'Pin', description: 'Pin/unpin current session', category: 'navigation', handler: 'chat/commands/pin', isSystem: true },
  ];
  for (const cmd of builtinCommands) {
    await db.insert(chatCommands).values({ ...cmd, enabled: true }).onConflictDoNothing();
  }

  // Seed built-in skills
  const builtinSkills = [
    { slug: 'summarize', name: 'Summarize', description: 'Summarize conversation or document', whenToUse: 'When user asks to summarize', source: 'builtin', promptTemplate: 'Summarize the following content concisely:\n\n{{content}}' },
    { slug: 'translate', name: 'Translate', description: 'Translate content between languages', whenToUse: 'When user asks to translate', source: 'builtin', promptTemplate: 'Translate the following to {{targetLanguage}}:\n\n{{content}}' },
    { slug: 'extract', name: 'Extract', description: 'Extract structured data from text', whenToUse: 'When user asks to extract data', source: 'builtin', promptTemplate: 'Extract structured data from the following text. Output as JSON:\n\n{{content}}' },
    { slug: 'analyze', name: 'Analyze', description: 'Analyze data, generate insights', whenToUse: 'When user provides data for analysis', source: 'builtin', promptTemplate: 'Analyze the following data and provide key insights:\n\n{{content}}' },
    { slug: 'faq-create', name: 'FAQ Create', description: 'Create KB entry from conversation', whenToUse: 'When user wants to save Q&A to KB', source: 'builtin', promptTemplate: 'Create a knowledge base FAQ entry from this conversation:\n\nQuestion: {{question}}\nAnswer: {{answer}}' },
    { slug: 'report', name: 'Report', description: 'Generate formatted report', whenToUse: 'When user asks for a report', source: 'builtin', promptTemplate: 'Generate a formatted report on the following topic:\n\n{{topic}}\n\nInclude: {{sections}}' },
  ];
  for (const skill of builtinSkills) {
    await db.insert(chatSkills).values({ ...skill, enabled: true }).onConflictDoNothing();
  }
}
```

### F. API Handler Example

```typescript
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const userId = request.headers.get('x-user-id');
  const tenantId = request.headers.get('x-tenant-id');
  const conditions = [eq(chatSessions.userId, Number(userId))];
  if (tenantId) conditions.push(eq(chatSessions.tenantId, Number(tenantId)));
  if (params.filter?.status) conditions.push(eq(chatSessions.status, params.filter.status));
  const where = and(...conditions);
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatSessions).where(where).orderBy(desc(chatSessions.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatSessions).where(where),
  ]);
  return listResponse(rows, 'chat-sessions', params, Number(count));
}
```
