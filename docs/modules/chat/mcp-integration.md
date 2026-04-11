# Chat Module — MCP Integration

> Specification for Model Context Protocol (MCP) server integration in module-chat.
> Inspired by Claude Code's MCP architecture.

---

## Overview

MCP (Model Context Protocol) enables connecting external AI tool servers to the chat system. When an MCP server is connected, its tools become available to agents alongside the platform's built-in module API tools.

## Supported Transports

| Transport | Type | Use Case |
|-----------|------|----------|
| `stdio` | Local process | MCP servers running as local commands (e.g., `npx @modelcontextprotocol/server-filesystem`) |
| `sse` | HTTP + SSE | Remote MCP servers with Server-Sent Events streaming |
| `http` | HTTP | Standard HTTP-based MCP servers (request/response) |
| `ws` | WebSocket | Real-time bidirectional MCP servers |

## Connection Config

```typescript
interface MCPConnectionConfig {
  stdio?: {
    command: string;        // e.g., "node", "npx", "python"
    args?: string[];        // e.g., ["server.js", "--port", "3001"]
    env?: Record<string, string>; // environment variables
  };
  sse?: {
    url: string;            // e.g., "https://mcp.example.com/sse"
    headers?: Record<string, string>; // auth headers
  };
  http?: {
    url: string;
    headers?: Record<string, string>;
  };
  ws?: {
    url: string;            // e.g., "wss://mcp.example.com/ws"
  };
}
```

## Tool Discovery

When an MCP server is connected:

```
1. Chat module establishes connection via configured transport
2. Sends "tools/list" request to MCP server
3. Server responds with tool definitions (name, description, inputSchema)
4. Tools cached in chat_mcp_connections.toolDefinitions (JSONB)
5. Tools bridged into agent tool catalog format
6. Agent can now discover and invoke MCP tools during reasoning
```

### MCP Tool Bridge

```typescript
interface MCPDiscoveredTool {
  name: string;              // e.g., "filesystem.readFile"
  description: string;
  inputSchema: JsonSchema;   // tool's parameter schema
  serverSlug: string;        // which MCP server provides this
  serverName: string;
}

// Bridged to agent tool format:
interface AgentTool {
  name: string;              // "mcp.{serverSlug}.{toolName}"
  description: string;
  parameters: JsonSchema;
  category: 'mcp';
  metadata: {
    mcpServerSlug: string;
    originalToolName: string;
  };
}
```

## Tool Invocation

When an agent invokes an MCP tool:

```
1. Tool Wrapper receives tool call with name "mcp.{serverSlug}.{toolName}"
2. Resolves MCP connection from chat_mcp_connections
3. Sends "tools/call" request to MCP server with tool name + arguments
4. MCP server executes tool and returns result
5. Result returned to agent's reasoning loop
6. Execution logged in chat_actions table
```

## Connection Lifecycle

```
State Machine:
  disconnected → connecting → connected → disconnected
                     ↓
                   error → disconnected (after retry backoff)
```

### Auto-Reconnect
- On connection loss: exponential backoff retry (1s, 2s, 4s, 8s, max 30s)
- Max retries: 5 per connection attempt
- Status tracked in `chat_mcp_connections.status`

### Health Check
- Periodic ping to connected servers (configurable interval, default 60s)
- On health check failure: mark as disconnected, trigger reconnect

## Security Considerations

1. **Credential encryption**: MCP connection configs with sensitive headers/tokens are encrypted in JSONB (reusing module-ai's encryption)
2. **Permission scoping**: MCP tools inherit the invoking user's permissions — no privilege escalation
3. **Tool allowlisting**: Admins can disable specific MCP tools per tenant
4. **Rate limiting**: MCP tool calls count toward the session's rate limit
5. **Timeout**: MCP tool calls have a configurable timeout (default 30s)

## Dashboard UI

MCP server management is part of the Chat module's dashboard:

- **MCP Servers List**: Shows all connections with status badges (connected/disconnected/error)
- **Add MCP Server**: Form with transport selector, config fields, test connection button
- **Server Detail**: Shows discovered tools, connection history, error logs
- **Tool Browser**: Lists all tools from all connected MCP servers with descriptions

## Database

Uses the `chat_mcp_connections` table defined in `08-chat.md` section 5.

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/chat-mcp-servers` | List MCP connections (filtered by tenant) |
| POST | `/api/chat-mcp-servers` | Add MCP server connection |
| GET | `/api/chat-mcp-servers/[id]` | Get connection details |
| PUT | `/api/chat-mcp-servers/[id]` | Update connection config |
| DELETE | `/api/chat-mcp-servers/[id]` | Remove MCP server |
| POST | `/api/chat-mcp-servers/[id]/connect` | Establish connection |
| POST | `/api/chat-mcp-servers/[id]/disconnect` | Close connection |
| GET | `/api/chat-mcp-servers/[id]/tools` | List discovered tools |

## Events

| Event | Payload |
|-------|---------|
| `chat.mcp.connected` | id, tenantId, serverSlug, toolCount |
| `chat.mcp.disconnected` | id, tenantId, serverSlug, reason |
| `chat.mcp.error` | id, tenantId, serverSlug, error |
| `chat.mcp.tool.invoked` | connectionId, toolName, status, durationMs |

## Config

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ENABLE_MCP` | boolean | false | Enable MCP integration for tenant |
| `MAX_MCP_CONNECTIONS` | number | 5 | Max MCP servers per tenant |
| `MCP_TOOL_TIMEOUT_MS` | number | 30000 | Timeout for MCP tool calls |
| `MCP_HEALTH_CHECK_INTERVAL` | number | 60 | Seconds between health checks |
| `MCP_MAX_RECONNECT_ATTEMPTS` | number | 5 | Max auto-reconnect attempts |

## Tests

```
mcp-connector.test.ts — 10 tests:
  - connects via stdio transport
  - connects via sse transport
  - connects via http transport
  - connects via ws transport
  - handles connection failure gracefully
  - auto-reconnects on disconnect
  - respects max retry attempts
  - discovers tools on connection
  - caches discovered tools
  - updates status on state changes

mcp-tool-bridge.test.ts — 8 tests:
  - bridges MCP tool to agent tool format
  - prefixes tool name with server slug
  - preserves input schema
  - invokes tool through MCP connection
  - handles tool invocation errors
  - respects timeout configuration
  - logs tool invocation in chat_actions
  - filters disabled tools

mcp-server-manager.test.ts — 6 tests:
  - loads connections from DB on init
  - connects enabled servers
  - tracks connection status
  - handles server removal
  - periodic health check
  - disconnects all on shutdown
```
