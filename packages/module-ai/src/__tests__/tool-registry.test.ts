import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWhere = vi.fn();
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
  })),
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: 'eq', args })),
}));

vi.mock('../schema', () => ({
  aiTools: {
    enabled: 'enabled',
    slug: 'slug',
  },
}));

import { getBuiltInTools, getAllTools } from '../tools/registry';

describe('tool-registry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockResolvedValue([]);
  });

  describe('getBuiltInTools()', () => {
    it('returns 6 built-in tools', () => {
      const tools = getBuiltInTools();
      expect(tools).toHaveLength(6);
    });

    it('each tool has required fields', () => {
      const tools = getBuiltInTools();
      for (const tool of tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('slug');
        expect(tool).toHaveProperty('category');
        expect(tool).toHaveProperty('description');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.slug).toBe('string');
        expect(typeof tool.category).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.slug.length).toBeGreaterThan(0);
      }
    });

    it('all tools have isSystem=true', () => {
      const tools = getBuiltInTools();
      for (const tool of tools) {
        expect(tool.isSystem).toBe(true);
      }
    });

    it('includes expected tool slugs', () => {
      const tools = getBuiltInTools();
      const slugs = tools.map((t) => t.slug);
      expect(slugs).toContain('ai.embed');
      expect(slugs).toContain('ai.embedMany');
      expect(slugs).toContain('ai.generateText');
      expect(slugs).toContain('ai.streamText');
      expect(slugs).toContain('ai.generateImage');
      expect(slugs).toContain('ai.generateObject');
    });

    it('returns a copy (not the internal array)', () => {
      const tools1 = getBuiltInTools();
      const tools2 = getBuiltInTools();
      expect(tools1).not.toBe(tools2);
      expect(tools1).toEqual(tools2);
    });
  });

  describe('getAllTools()', () => {
    it('returns built-in tools when DB has no custom tools', async () => {
      mockWhere.mockResolvedValueOnce([]);
      const tools = await getAllTools();
      expect(tools).toHaveLength(6);
    });

    it('merges DB custom tools with built-in tools', async () => {
      mockWhere.mockResolvedValueOnce([
        {
          name: 'Custom Summarizer',
          slug: 'custom.summarize',
          category: 'custom',
          description: 'Summarizes text using AI',
          handler: '@my/handler#summarize',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' },
          isSystem: false,
        },
      ]);

      const tools = await getAllTools();
      expect(tools).toHaveLength(7); // 6 built-in + 1 custom
      expect(tools.find((t) => t.slug === 'custom.summarize')).toBeDefined();
    });

    it('deduplicates custom tools that share slug with built-in', async () => {
      mockWhere.mockResolvedValueOnce([
        {
          name: 'Override Embed',
          slug: 'ai.embed', // same slug as built-in
          category: 'embedding',
          description: 'Custom embed override',
          handler: '@my/handler#embed',
          inputSchema: {},
          outputSchema: {},
          isSystem: false,
        },
      ]);

      const tools = await getAllTools();
      // Should still be 6 because the duplicate is filtered out
      expect(tools).toHaveLength(6);
      // The built-in version should be kept (isSystem=true)
      const embedTool = tools.find((t) => t.slug === 'ai.embed');
      expect(embedTool?.isSystem).toBe(true);
    });

    it('handles null fields from DB gracefully', async () => {
      mockWhere.mockResolvedValueOnce([
        {
          name: 'Minimal Tool',
          slug: 'custom.minimal',
          category: null,
          description: null,
          handler: null,
          inputSchema: null,
          outputSchema: null,
          isSystem: false,
        },
      ]);

      const tools = await getAllTools();
      const minimal = tools.find((t) => t.slug === 'custom.minimal');
      expect(minimal).toBeDefined();
      expect(minimal!.category).toBe('custom');
      expect(minimal!.description).toBe('');
      expect(minimal!.handler).toBe('');
    });
  });
});
