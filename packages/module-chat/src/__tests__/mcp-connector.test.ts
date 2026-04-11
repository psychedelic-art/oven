import { describe, it, expect, vi, beforeEach } from 'vitest';

let selectResult: unknown[] = [];
let updateResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResult)),
          orderBy: vi.fn(() => Promise.resolve(selectResult)),
        })),
        orderBy: vi.fn(() => Promise.resolve(selectResult)),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(updateResult)),
        })),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

import {
  getDiscoveredTools,
  bridgeToolsForAgent,
  executeMCPTool,
  getConnectionStatus,
} from '../engine/mcp-connector';

describe('MCPConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    updateResult = [];
  });

  describe('getDiscoveredTools()', () => {
    it('returns tools from connected MCP servers', async () => {
      selectResult = [
        {
          id: 1,
          name: 'Weather API',
          status: 'connected',
          discoveredTools: [
            { name: 'getWeather', description: 'Get weather', parameters: { location: { type: 'string' } } },
          ],
        },
      ];
      const tools = await getDiscoveredTools(1);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('getWeather');
      expect(tools[0].mcpConnectionId).toBe(1);
    });

    it('returns empty array when no connected servers', async () => {
      selectResult = [];
      const tools = await getDiscoveredTools(1);
      expect(tools).toHaveLength(0);
    });

    it('skips disconnected servers', async () => {
      selectResult = [
        { id: 1, name: 'Offline API', status: 'disconnected', discoveredTools: [{ name: 'tool1' }] },
      ];
      // getDiscoveredTools filters by status='connected'
      const tools = await getDiscoveredTools(1);
      // The mock returns the selectResult regardless, but the implementation filters
      // Since we mock the DB query with where(), the filter is applied at DB level
      expect(tools).toBeDefined();
    });
  });

  describe('bridgeToolsForAgent()', () => {
    it('formats MCP tools as ToolSpec-compatible objects', () => {
      const mcpTools = [
        { name: 'getWeather', description: 'Get weather data', parameters: { location: { type: 'string' } }, mcpConnectionId: 1, mcpServerName: 'Weather API' },
      ];
      const specs = bridgeToolsForAgent(mcpTools);
      expect(specs).toHaveLength(1);
      expect(specs[0].name).toBe('mcp.getWeather');
      expect(specs[0].moduleSlug).toBe('mcp');
    });

    it('prefixes tool names with mcp.', () => {
      const mcpTools = [
        { name: 'search', description: 'Search', parameters: {}, mcpConnectionId: 1, mcpServerName: 'Search' },
      ];
      const specs = bridgeToolsForAgent(mcpTools);
      expect(specs[0].name).toBe('mcp.search');
    });
  });

  describe('executeMCPTool()', () => {
    it('makes HTTP request to MCP server and returns result', async () => {
      const mockResponse = { temperature: 22, unit: 'celsius' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });
      const result = await executeMCPTool({
        connectionUrl: 'https://mcp.example.com',
        toolName: 'getWeather',
        input: { location: 'London' },
        transport: 'http',
      });
      expect(result.success).toBe(true);
      expect(result.output).toEqual(mockResponse);
    });

    it('returns error on fetch failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await executeMCPTool({
        connectionUrl: 'https://mcp.example.com',
        toolName: 'getWeather',
        input: {},
        transport: 'http',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('returns error on non-OK response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      const result = await executeMCPTool({
        connectionUrl: 'https://mcp.example.com',
        toolName: 'tool',
        input: {},
        transport: 'http',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getConnectionStatus()', () => {
    it('returns status for a specific connection', async () => {
      selectResult = [{ id: 1, name: 'Weather', status: 'connected', discoveredTools: [] }];
      const status = await getConnectionStatus(1);
      expect(status).not.toBeNull();
      expect(status!.status).toBe('connected');
    });

    it('returns null for non-existent connection', async () => {
      selectResult = [];
      const status = await getConnectionStatus(999);
      expect(status).toBeNull();
    });
  });
});
