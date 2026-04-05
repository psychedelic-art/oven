# Chat Module — Command System

> Specification for the `/slash` command system in module-chat.
> Inspired by Claude Code's command architecture.

---

## Overview

Commands are quick actions triggered by `/` prefix in the chat input. They execute locally without LLM reasoning, providing instant results for common operations.

## Command Interface

```typescript
interface ChatCommand {
  name: string;           // display name
  slug: string;           // unique identifier (used after /)
  description: string;
  category: 'navigation' | 'agent' | 'tools' | 'export' | 'settings';
  parameters?: JsonSchema; // optional args schema
  permissions?: string[];  // required permission slugs
  execute: (args: CommandArgs, context: ChatContext) => Promise<CommandResult>;
}

interface CommandArgs {
  raw: string;           // everything after the command name
  parsed: Record<string, unknown>; // parsed against parameters schema
}

interface ChatContext {
  sessionId: number;
  tenantId: number;
  userId: number;
  agentId: number;
  db: DrizzleClient;
  registry: ModuleRegistry;
}

interface CommandResult {
  type: 'message' | 'action' | 'redirect';
  content?: string;       // displayed as system message
  data?: unknown;         // structured data for rendering
  systemMessage?: string; // injected into next agent prompt
}
```

## Built-in Commands (15)

### Navigation

| Command | Slug | Args | Description |
|---------|------|------|-------------|
| `/help` | `help` | `[command?]` | List all commands, or show help for specific command |
| `/clear` | `clear` | — | Clear conversation messages (keeps session) |
| `/status` | `status` | — | Show session stats: message count, token usage, cost, duration |
| `/reset` | `reset` | — | Reset session context (clear accumulated entity references) |
| `/feedback` | `feedback` | `[comment?]` | Submit session-level feedback |
| `/pin` | `pin` | — | Toggle pin on current session |

### Agent

| Command | Slug | Args | Description |
|---------|------|------|-------------|
| `/agent` | `agent` | `<slug>` | Switch the backing agent for this session |

### Tools

| Command | Slug | Args | Description |
|---------|------|------|-------------|
| `/tools` | `tools` | `[filter?]` | List available tools (optionally filtered by module) |
| `/search` | `search` | `<query>` | Search knowledge base directly (bypasses agent reasoning) |
| `/skill` | `skill` | `<name> [args?]` | Invoke a registered skill |
| `/mcp` | `mcp` | — | List connected MCP servers and their tools |

### Export

| Command | Slug | Args | Description |
|---------|------|------|-------------|
| `/export` | `export` | `[json\|md\|txt]` | Export conversation in specified format (default: json) |

### Settings

| Command | Slug | Args | Description |
|---------|------|------|-------------|
| `/mode` | `mode` | `<creative\|precise\|balanced>` | Adjust agent behavior mode for this session |
| `/model` | `model` | `<alias>` | Override the model alias for this session |
| `/temperature` | `temperature` | `<0.0-2.0>` | Override temperature for this session |

## Command Resolution Flow

```
User types: "/search horarios de atencion"
  1. ChatInput detects '/' prefix
  2. CommandPalette shows filtered commands as user types
  3. User sends message
  4. engine/command-registry.ts intercepts:
     a. Parse command slug: "search"
     b. Parse args: "horarios de atencion"
     c. Check permissions: user has 'chat-messages.create'
     d. Execute command handler
  5. /search calls POST /api/knowledge-base/[tenantSlug]/search directly
  6. Returns CommandResult with search results
  7. Result rendered as system message in chat
```

## Custom Commands

Tenants can register custom commands via the `chat_commands` table:

```typescript
// Example: custom command for a dental clinic
{
  name: 'Agendar',
  slug: 'agendar',
  description: 'Open appointment scheduling',
  category: 'tools',
  handler: 'redirect:schedulingUrl',  // redirect to tenant's scheduling URL
  tenantId: 5,
  isSystem: false,
  enabled: true,
}
```

## Database

Uses the `chat_commands` table defined in `08-chat.md` section 5.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/chat-commands` | List available commands (filtered by tenant + permissions) |
| POST | `/api/chat-commands/[slug]/execute` | Execute a command |
| POST | `/api/chat-commands` | Register custom command (admin) |
| PUT | `/api/chat-commands/[id]` | Update custom command |
| DELETE | `/api/chat-commands/[id]` | Delete custom command |

## Tests

```
command-registry.test.ts — 12 tests:
  - registers built-in commands on init
  - discovers custom commands from DB
  - resolves command by slug
  - parses args against parameter schema
  - checks permissions before execution
  - returns error for unknown command
  - returns error for insufficient permissions
  - executes /help and returns command list
  - executes /search with query args
  - executes /mode with valid mode
  - rejects /mode with invalid mode
  - executes /export with format arg

commands/*.test.ts — 15 tests (one per built-in command)
```
