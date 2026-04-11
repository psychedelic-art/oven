import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatMcpConnections } from '../schema';

// ─── MCP Tool (discovered from server) ──────────────────────

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  mcpConnectionId: number;
  mcpServerName: string;
}

// ─── MCP Tool Spec (bridged for agent consumption) ──────────

export interface MCPToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  method: string;
  route: string;
  moduleSlug: string;
  mcpConnectionId: number;
}

// ─── MCP Execution Result ───────────────────────────────────

export interface MCPExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}

// ─── Get Discovered Tools ───────────────────────────────────
// Returns all tools from connected MCP servers for a tenant.

export async function getDiscoveredTools(tenantId: number): Promise<MCPTool[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chatMcpConnections)
    .where(and(
      eq(chatMcpConnections.tenantId, tenantId),
      eq(chatMcpConnections.status, 'connected'),
    ))
    .orderBy(chatMcpConnections.name);

  const tools: MCPTool[] = [];
  for (const conn of rows as Array<Record<string, unknown>>) {
    const discovered = conn.discoveredTools as Array<Record<string, unknown>> | null;
    if (discovered && Array.isArray(discovered)) {
      for (const tool of discovered) {
        tools.push({
          name: tool.name as string,
          description: (tool.description as string) ?? '',
          parameters: (tool.parameters as Record<string, unknown>) ?? {},
          mcpConnectionId: conn.id as number,
          mcpServerName: conn.name as string,
        });
      }
    }
  }

  return tools;
}

// ─── Bridge Tools for Agent ─────────────────────────────────
// Converts MCP tools to ToolSpec format for agent-core consumption.
// Prefixes tool names with "mcp." to avoid collisions.

export function bridgeToolsForAgent(mcpTools: MCPTool[]): MCPToolSpec[] {
  return mcpTools.map(tool => ({
    name: `mcp.${tool.name}`,
    description: `[MCP: ${tool.mcpServerName}] ${tool.description}`,
    parameters: tool.parameters,
    method: 'POST',
    route: `/mcp/${tool.mcpConnectionId}/tools/${tool.name}`,
    moduleSlug: 'mcp',
    mcpConnectionId: tool.mcpConnectionId,
  }));
}

// ─── Execute MCP Tool ───────────────────────────────────────
// Calls an MCP server tool via HTTP and returns the result.

export async function executeMCPTool(input: {
  connectionUrl: string;
  toolName: string;
  input: unknown;
  transport: string;
  timeout?: number;
}): Promise<MCPExecutionResult> {
  const startTime = Date.now();
  const timeout = input.timeout ?? 10000;

  try {
    const response = await fetch(`${input.connectionUrl}/tools/${input.toolName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: input.input }),
      signal: AbortSignal.timeout(timeout),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        error: `MCP tool returned ${response.status}: ${response.statusText}`,
        durationMs,
      };
    }

    const output = await response.json();
    return { success: true, output, durationMs };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'MCP tool execution failed',
      durationMs: Date.now() - startTime,
    };
  }
}

// ─── Get Connection Status ──────────────────────────────────

export async function getConnectionStatus(connectionId: number): Promise<{
  id: number;
  name: string;
  status: string;
  discoveredTools: unknown[];
} | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chatMcpConnections)
    .where(eq(chatMcpConnections.id, connectionId))
    .limit(1);

  if (rows.length === 0) return null;
  const conn = rows[0] as Record<string, unknown>;
  return {
    id: conn.id as number,
    name: conn.name as string,
    status: conn.status as string,
    discoveredTools: (conn.discoveredTools as unknown[]) ?? [],
  };
}

// ─── Format MCP Tools for Prompt ────────────────────────────

export function getMCPToolDescriptions(tools: MCPTool[]): string {
  if (tools.length === 0) return '';
  const lines = tools.map(t => `- mcp.${t.name} (${t.mcpServerName}): ${t.description}`);
  return `Available MCP tools:\n${lines.join('\n')}`;
}
