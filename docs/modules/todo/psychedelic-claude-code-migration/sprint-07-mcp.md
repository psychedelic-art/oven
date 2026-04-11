# Sprint 07 — MCP Adapter

## Goal

Integrate Model Context Protocol (MCP) servers as **adapter packages**
following Rule 3.3, so that any MCP server can be plugged into OVEN
without modifying `module-claude-code`.

## Scope

- Define the adapter interface in
  `packages/module-claude-code/src/adapters/mcp/types.ts`:
  ```ts
  export interface McpServerAdapter {
    name: string;
    transport: 'stdio' | 'sse' | 'streamable-http';
    listTools(): Promise<McpToolDescriptor[]>;
    callTool(name: string, input: unknown): Promise<unknown>;
    listResources?(): Promise<McpResource[]>;
    readResource?(uri: string): Promise<unknown>;
    listPrompts?(): Promise<McpPrompt[]>;
    getPrompt?(name: string, args: unknown): Promise<unknown>;
  }
  ```
- Add a registry: `registerMcpServer(adapter: McpServerAdapter)`.
- At dashboard boot, registered MCP servers contribute their tools to
  `claudeCodeModule.chat.actionSchemas` as
  `mcp.<server>.<tool>` actions (Rule 2.1).
- Create one reference adapter package:
  `packages/mcp-filesystem/` — wraps the upstream filesystem MCP
  server using `@modelcontextprotocol/sdk`.
- Wire it in `apps/dashboard/src/lib/modules.ts`:
  ```ts
  import { registerMcpServer } from '@oven/module-claude-code';
  import { filesystemMcpAdapter } from '@oven/mcp-filesystem';
  registerMcpServer(filesystemMcpAdapter);
  ```
- Persist MCP server configs (URL, transport, env) per tenant in a new
  `claude_code_mcp_servers` table — values referenced by config keys
  go through `module-config` (Rule 13.1).

## Out of scope

- A second MCP adapter.
- An MCP discovery UI.
- MCP client features (resources, prompts) beyond what's required to
  list and call tools.

## Deliverables

- `mcp-filesystem` adapter ships and is registered.
- A `curl POST /api/claude-code/<slug>/tools/mcp.filesystem.read_file`
  works end-to-end.

## Acceptance criteria

- [ ] `module-claude-code` does **not** import `mcp-filesystem`
      (verified by ESLint rule, Rule 3.3).
- [ ] MCP-contributed actions appear in `registry.getAll()` output.
- [ ] All MCP tool invocations land in `claude_code_tool_invocations`
      with `tool` prefixed `mcp.`.

## Touched packages

- `packages/module-claude-code/` (extend)
- `packages/mcp-filesystem/` (new)
- `apps/dashboard/src/lib/modules.ts`

## Risks

- **R1**: MCP SDK has breaking changes between versions.
  *Mitigation*: pin the SDK version in the adapter package only.

## Rule references

Rule 2.1, Rule 3.1, Rule 3.3, Rule 13.1.
