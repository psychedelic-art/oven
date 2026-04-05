import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@oven/module-registry', () => ({
  registry: {
    getAll: vi.fn(() => [
      {
        name: 'knowledge-base',
        apiHandlers: {
          'kb-entries': { GET: {}, POST: {} },
          'kb-entries/[id]': { GET: {}, PUT: {}, DELETE: {} },
        },
        chat: {
          actionSchemas: [
            {
              name: 'kb.search',
              description: 'Search the knowledge base',
              parameters: { query: { type: 'string', required: true } },
              endpoint: { method: 'POST', path: 'knowledge-base/[tenantSlug]/search' },
              requiredPermissions: [],
            },
          ],
        },
      },
      {
        name: 'ai',
        apiHandlers: { 'ai/generate': { POST: {} } },
        chat: {
          actionSchemas: [
            {
              name: 'ai.generate',
              description: 'Generate text',
              parameters: { prompt: { type: 'string', required: true } },
              endpoint: { method: 'POST', path: 'ai/generate' },
            },
          ],
        },
      },
    ]),
  },
}));

import { discoverTools, getToolsForAgent, clearToolCache } from '../engine/tool-wrapper';

describe('ToolWrapper', () => {
  beforeEach(() => {
    clearToolCache();
  });

  describe('discoverTools()', () => {
    it('discovers tools from chat.actionSchemas', () => {
      const tools = discoverTools();
      const kbSearch = tools.find((t) => t.name === 'kb.search');
      expect(kbSearch).toBeDefined();
      expect(kbSearch?.description).toBe('Search the knowledge base');
      expect(kbSearch?.moduleSlug).toBe('knowledge-base');
    });

    it('discovers tools from apiHandlers', () => {
      const tools = discoverTools();
      // Should have auto-generated tools for endpoints not covered by actionSchemas
      expect(tools.length).toBeGreaterThan(2);
    });

    it('caches results on subsequent calls', () => {
      const tools1 = discoverTools();
      const tools2 = discoverTools();
      expect(tools1).toBe(tools2); // Same reference = cached
    });

    it('returns fresh results after clearToolCache', () => {
      const tools1 = discoverTools();
      clearToolCache();
      const tools2 = discoverTools();
      expect(tools1).not.toBe(tools2);
      expect(tools1).toEqual(tools2);
    });
  });

  describe('getToolsForAgent()', () => {
    it('returns all tools for wildcard binding', () => {
      const tools = getToolsForAgent(['*']);
      expect(tools.length).toBeGreaterThan(0);
    });

    it('returns no tools for empty bindings', () => {
      const tools = getToolsForAgent([]);
      expect(tools).toEqual([]);
    });

    it('returns no tools for null bindings', () => {
      const tools = getToolsForAgent(null);
      expect(tools).toEqual([]);
    });

    it('filters by exact tool name', () => {
      const tools = getToolsForAgent(['kb.search']);
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('kb.search');
    });

    it('filters by module wildcard pattern', () => {
      const tools = getToolsForAgent(['knowledge-base.*']);
      expect(tools.length).toBeGreaterThanOrEqual(1);
      expect(tools.every((t) => t.moduleSlug === 'knowledge-base' || t.name.startsWith('knowledge-base'))).toBe(true);
    });
  });
});
