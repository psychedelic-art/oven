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

## 5. Database Schema

### Tables

**`chat_sessions`** — Conversation sessions
- `id` (serial, PK)
- `userId` (integer) — who initiated the session
- `agentId` (integer, nullable) — which agent backs this session (FK concept to agents table). If null, uses the default platform agent
- `title` (varchar, nullable) — auto-generated or user-set
- `context` (JSONB) — accumulated session context (referenced entities, prior intents)
- `status` (varchar) — active, archived
- `createdAt`, `updatedAt` (timestamps)

**`chat_messages`** — Individual messages in a session
- `id` (serial, PK)
- `sessionId` (integer, FK -> chat_sessions)
- `role` (varchar) — user, assistant, system, tool
- `content` (JSONB) — parts-based content (text, image references, audio references) to support multimodal messages
- `toolCalls` (JSONB, nullable) — tool calls the agent made in this response
- `toolResults` (JSONB, nullable) — tool execution results
- `metadata` (JSONB) — model used, tokens consumed, latency, cost
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
