import { registry } from '@oven/module-registry';
import type { ToolSpec } from '../types';

// ─── Tool Discovery Cache ───────────────────────────────────

let toolCache: ToolSpec[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

// ─── Route → tool name (F-04-03) ────────────────────────────
// Convert a route like `/api/[tenantSlug]/knowledge-base/[id]/search`
// into a tool name `knowledge-base.search`. Path params ([foo]) are
// dropped. Leading `api` is dropped. Empty segments are dropped.
export function routeToToolName(moduleSlug: string, route: string): string {
  const segments = route
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== 'api' && !(s.startsWith('[') && s.endsWith(']')));
  const tail = segments.join('.');
  return tail ? `${moduleSlug}.${tail}` : moduleSlug;
}

/**
 * Discover all available tools from registered modules.
 * Reads each module's chat.actionSchemas and apiHandlers
 * to generate a unified tool catalog for agents.
 */
export function discoverTools(): ToolSpec[] {
  const now = Date.now();
  if (toolCache.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return toolCache;
  }

  const tools: ToolSpec[] = [];
  const modules = registry.getAll();

  for (const mod of modules) {
    // 1. Rich tool specs from chat.actionSchemas (preferred)
    if (mod.chat?.actionSchemas) {
      for (const schema of mod.chat.actionSchemas) {
        tools.push({
          name: schema.name,
          description: schema.description,
          parameters: schema.parameters ?? {},
          method: schema.endpoint?.method ?? 'POST',
          route: schema.endpoint?.path ?? '',
          moduleSlug: mod.name,
          requiredPermissions: schema.requiredPermissions,
        });
      }
    }

    // 2. Auto-generated from apiHandlers (for endpoints without explicit schemas)
    if (mod.apiHandlers) {
      for (const [route, handlers] of Object.entries(mod.apiHandlers)) {
        for (const method of Object.keys(handlers)) {
          // F-04-03: split-based parser handles [param] segments
          const toolName = routeToToolName(mod.name, route);
          // Skip if already covered by an actionSchema
          if (tools.some((t) => t.route === route && t.method === method)) continue;

          tools.push({
            name: `${toolName}.${method.toLowerCase()}`,
            description: `${method} ${route} (${mod.name})`,
            parameters: {},
            method,
            route,
            moduleSlug: mod.name,
          });
        }
      }
    }
  }

  toolCache = tools;
  cacheTimestamp = now;
  return tools;
}

/**
 * Get tools filtered by an agent's toolBindings.
 * Supports wildcard patterns: ["*"] = all tools, ["kb.*"] = all kb tools
 */
export function getToolsForAgent(toolBindings: string[] | null): ToolSpec[] {
  const allTools = discoverTools();
  if (!toolBindings || toolBindings.length === 0) return [];
  if (toolBindings.includes('*')) return allTools;

  return allTools.filter((tool) =>
    toolBindings.some((binding) => {
      if (binding === '*') return true;
      if (binding.endsWith('.*')) {
        const prefix = binding.slice(0, -2);
        return tool.name.startsWith(prefix) || tool.moduleSlug === prefix;
      }
      return tool.name === binding;
    })
  );
}

// ─── Permission error (F-04-02) ─────────────────────────────
// Thrown by executeTool when the caller lacks a permission declared in
// tool.requiredPermissions. Exposed so chat/workflow hosts can map it
// to a 403 or a user-facing "permission denied" message.

export class ToolPermissionError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly missing: string[],
  ) {
    super(`Tool ${toolName} requires permissions: ${missing.join(', ')}`);
    this.name = 'ToolPermissionError';
  }
}

/**
 * Execute a tool by making an HTTP request to the module's API endpoint.
 *
 * F-04-02: the optional `context.permissions` set is checked against the
 * tool's declared `requiredPermissions`. Missing permissions short-circuit
 * with ToolPermissionError; callers without a `permissions` set skip the
 * check (agent/workflow hosts that have not yet integrated auth).
 */
export async function executeTool(
  tool: ToolSpec,
  input: Record<string, unknown>,
  baseUrl: string = '',
  context?: {
    /** Set of permission slugs held by the caller (e.g. 'kb-entries.read'). */
    permissions?: ReadonlySet<string>;
  },
): Promise<unknown> {
  // Permission gating (F-04-02)
  if (tool.requiredPermissions && tool.requiredPermissions.length > 0 && context?.permissions) {
    const missing = tool.requiredPermissions.filter((p) => !context.permissions!.has(p));
    if (missing.length > 0) {
      throw new ToolPermissionError(tool.name, missing);
    }
  }

  // Resolve route params from input
  let resolvedRoute = tool.route;
  for (const [key, value] of Object.entries(input)) {
    resolvedRoute = resolvedRoute.replace(`[${key}]`, String(value));
  }

  const url = `${baseUrl}/api/${resolvedRoute}`;
  const isReadOnly = tool.method === 'GET' || tool.method === 'DELETE';

  const fetchOptions: RequestInit = {
    method: tool.method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (!isReadOnly && Object.keys(input).length > 0) {
    fetchOptions.body = JSON.stringify(input);
  }

  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Tool ${tool.name} failed: HTTP ${response.status} — ${errBody}`);
  }

  return response.json();
}

/**
 * Clear the tool cache (useful after module registration changes).
 */
export function clearToolCache(): void {
  toolCache = [];
  cacheTimestamp = 0;
}
