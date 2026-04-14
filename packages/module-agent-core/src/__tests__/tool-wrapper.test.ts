import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import {
  discoverTools,
  getToolsForAgent,
  clearToolCache,
  routeToToolName,
  executeTool,
  ToolPermissionError,
} from '../engine/tool-wrapper';
import type { ToolSpec } from '../types';

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

  // ─── F-04-03: routeToToolName ──────────────────────────────
  describe('routeToToolName()', () => {
    it('handles simple routes', () => {
      expect(routeToToolName('kb', 'search')).toBe('kb.search');
    });

    it('drops [param] segments', () => {
      expect(routeToToolName('kb', 'entries/[id]/publish')).toBe('kb.entries.publish');
    });

    it('handles tenant-slug pattern from the sprint example', () => {
      expect(routeToToolName('foo', '/api/[tenantSlug]/foo/[id]/bar')).toBe('foo.foo.bar');
    });

    it('collapses repeated slashes', () => {
      expect(routeToToolName('kb', '//entries//list//')).toBe('kb.entries.list');
    });

    it('returns just the module slug for empty routes', () => {
      expect(routeToToolName('kb', '')).toBe('kb');
      expect(routeToToolName('kb', '/api/[id]')).toBe('kb');
    });
  });

  // ─── F-04-02: executeTool permission gating ────────────────
  describe('executeTool() permission gating', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: 'ok' }),
      } as Response);
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    const protectedTool: ToolSpec = {
      name: 'admin.delete',
      description: 'Delete something sensitive',
      parameters: {},
      method: 'DELETE',
      route: 'admin/delete',
      moduleSlug: 'admin',
      requiredPermissions: ['admin.delete'],
    };

    it('rejects when required permission is missing', async () => {
      await expect(
        executeTool(protectedTool, {}, '', { permissions: new Set(['admin.read']) }),
      ).rejects.toThrow(ToolPermissionError);
    });

    it('allows when all required permissions are held', async () => {
      await expect(
        executeTool(protectedTool, {}, '', { permissions: new Set(['admin.delete']) }),
      ).resolves.toEqual({ result: 'ok' });
    });

    it('skips the check when no permissions set is supplied (backward-compat)', async () => {
      await expect(executeTool(protectedTool, {}, '')).resolves.toEqual({ result: 'ok' });
    });

    it('skips the check for tools without requiredPermissions', async () => {
      const openTool: ToolSpec = { ...protectedTool, name: 'public.ping', requiredPermissions: [] };
      await expect(
        executeTool(openTool, {}, '', { permissions: new Set() }),
      ).resolves.toEqual({ result: 'ok' });
    });

    it('ToolPermissionError reports the missing permissions', async () => {
      try {
        await executeTool(protectedTool, {}, '', { permissions: new Set() });
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ToolPermissionError);
        expect((err as ToolPermissionError).missing).toEqual(['admin.delete']);
        expect((err as ToolPermissionError).toolName).toBe('admin.delete');
      }
    });
  });
});
