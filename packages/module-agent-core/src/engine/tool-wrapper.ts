import { registry } from '@oven/module-registry';
import type { ToolSpec } from '../types';

// ─── Tool Discovery Cache ───────────────────────────────────

let toolCache: ToolSpec[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

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
          const toolName = `${mod.name}.${route.replace(/\//g, '.').replace(/\[.*?\]/g, '')}`.replace(/\.\./g, '.').replace(/\.$/, '');
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

/**
 * Execute a tool by making an HTTP request to the module's API endpoint.
 */
export async function executeTool(
  tool: ToolSpec,
  input: Record<string, unknown>,
  baseUrl: string = ''
): Promise<unknown> {
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
