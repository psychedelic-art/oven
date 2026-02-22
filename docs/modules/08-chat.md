# Module: Chat

> **Package**: `packages/module-chat/`
> **Name**: `@oven/module-chat`
> **Dependencies**: `module-registry`
> **Status**: Planned

---

## 1. Overview

Chat is an **AI-powered conversational agent** inspired by [Vanna](https://vanna.ai) that provides a natural language interface to the entire OVEN platform. It discovers available modules at runtime through the registry's self-description system, understands their capabilities, and can execute actions on behalf of the user.

The key architectural principle is **loose coupling**: Chat never imports module code directly. Instead, it reads module descriptions, capability declarations, and action schemas from the registry. When a new module is registered, Chat automatically learns about it — no code changes needed.

---

## 2. Core Concepts

### Module Self-Description
Each module can optionally declare its chat capabilities in the ModuleDefinition:

- **description**: What the module does (human-readable)
- **capabilities**: Array of high-level things the module can do (e.g., "create workflows", "manage roles", "score exams")
- **actionSchemas**: Structured definitions of available actions — name, parameters, return type, required permissions. These are similar to OpenAI function-calling schemas.

### Planner
The reasoning layer that interprets user intent and maps it to module actions:
1. Receives the user's natural language message
2. Queries the registry for all module descriptions and capabilities
3. Determines which module(s) and action(s) can fulfill the request
4. Builds an execution plan (possibly multi-step)
5. Validates the user has permission for each planned action

### Executor
The action layer that performs operations on behalf of the user:
1. Receives the plan from the Planner
2. Calls module API endpoints using the user's permissions
3. Handles errors, retries, and partial results
4. Returns structured results to the conversation

### Conversation Memory
Chat maintains session context so multi-turn conversations flow naturally. The agent remembers earlier queries, referenced entities, and ongoing tasks within a session.

---

## 3. Discovery Flow

```
User message
    ↓
Planner reads registry.getAll()
    ↓
Finds module descriptions + actionSchemas
    ↓
Maps intent → module actions
    ↓
Validates permissions via module-roles
    ↓
Executor calls module APIs (REST)
    ↓
Formats response → returns to user
```

When a new module is registered (e.g., `module-exams`), Chat automatically discovers it through the registry and can immediately interact with its declared actions. No coupling, no hardcoded references.

---

## 4. Capabilities

### What Chat Can Do
- **Query**: "How many exams were submitted this week?" → queries exams API
- **Create**: "Create a new workflow with three steps" → calls workflow creation API
- **Modify**: "Add question 5 to Exam A" → calls exam-questions API
- **Analyze**: "Show me the average score for Exam B" → queries scoring API + formats result
- **Navigate**: "Take me to the RLS policy editor" → returns a link/navigation action
- **Explain**: "What does the Forms module do?" → reads module description from registry
- **Multi-Step**: "Create an exam from questions tagged 'algebra', assign it to the Math flow, and notify reviewers" → chains multiple module actions

### What Chat Cannot Do
- Access data the current user doesn't have permission for
- Execute actions outside of declared module actionSchemas
- Modify system configuration or infrastructure
- Bypass RLS policies or role restrictions

---

## 5. Database Schema

### Tables

**`chat_sessions`** — Conversation sessions
- `id`, `userId` (integer), `title` (varchar — auto-generated or user-set)
- `context` (JSONB) — accumulated session context (referenced entities, prior intents)
- `status` (active/archived)
- `createdAt`, `updatedAt`

**`chat_messages`** — Individual messages in a session
- `id`, `sessionId` (FK → chat_sessions)
- `role` (user/assistant/system)
- `content` (text) — the message text
- `metadata` (JSONB) — model used, tokens, latency
- `createdAt`

**`chat_actions`** — Actions executed by the agent
- `id`, `messageId` (FK → chat_messages)
- `moduleSlug` (varchar) — which module was called
- `actionName` (varchar) — which action was invoked
- `input` (JSONB) — parameters sent
- `output` (JSONB) — result received
- `status` (success/error)
- `executedAt`

---

## 6. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/chat/sessions` | List and create sessions |
| GET/DELETE | `/api/chat/sessions/[id]` | Get or archive a session |
| GET | `/api/chat/sessions/[id]/messages` | List messages in a session |
| POST | `/api/chat/sessions/[id]/messages` | Send a message (triggers agent) |
| GET | `/api/chat/sessions/[id]/actions` | List actions executed in a session |
| GET | `/api/chat/capabilities` | List all discovered module capabilities |

---

## 7. Dashboard UI

### Custom Pages
- **Chat Interface** (`/chat`) — Full-page conversational UI with message history, action cards showing what the agent did, and quick-action suggestions
- **Chat Sidebar** — Collapsible chat panel accessible from any page in the dashboard

### Menu Section
```
──── Chat ────
Chat
```

---

## 8. ModuleDefinition Extension

To support chat discovery, the `ModuleDefinition` interface is extended with optional fields:

```typescript
interface ModuleDefinition {
  // ... existing fields ...
  chat?: {
    description: string;
    capabilities: string[];
    actionSchemas: ActionSchema[];
  };
}

interface ActionSchema {
  name: string;
  description: string;
  parameters: JSONSchema;
  returns: JSONSchema;
  requiredPermissions: string[];
  endpoint: { method: string; path: string };
}
```

Modules that don't declare `chat` are simply invisible to the agent — fully opt-in.

---

## 9. Events

| Event | Payload |
|-------|---------|
| `chat.session.created` | id, userId |
| `chat.session.archived` | id, userId |
| `chat.message.sent` | id, sessionId, role |
| `chat.action.executed` | id, sessionId, moduleSlug, actionName, status |

---

## 10. Integration Points

| Module | Integration |
|--------|-------------|
| **module-registry** | Discovers all modules via `registry.getAll()` + `mod.chat` |
| **module-roles** | Validates user permissions before executing actions |
| **All other modules** | Interacts via declared `actionSchemas` — fully loosely coupled |
