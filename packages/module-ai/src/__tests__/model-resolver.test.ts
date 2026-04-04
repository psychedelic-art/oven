import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
    from: mockFrom,
  })),
}));

// Mock drizzle-orm operators so they don't fail
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ op: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
}));

// Mock schema tables as plain objects
vi.mock('../schema', () => ({
  aiModelAliases: {
    alias: 'alias',
    enabled: 'enabled',
    modelId: 'modelId',
    type: 'type',
    defaultSettings: 'defaultSettings',
    providerId: 'providerId',
  },
  aiProviders: {
    id: 'id',
    slug: 'slug',
  },
}));

import { resolveModel, resolveEmbeddingModel } from '../engine/model-resolver';

describe('model-resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: alias lookup returns empty (no match)
    mockLimit.mockResolvedValue([]);
  });

  describe('resolveModel()', () => {
    it('resolves alias from mocked DB', async () => {
      mockLimit.mockResolvedValueOnce([
        {
          modelId: 'gpt-4o',
          type: 'text',
          defaultSettings: { temperature: 0.7 },
          providerSlug: 'openai',
        },
      ]);

      const result = await resolveModel('fast');
      expect(result).toEqual({
        provider: 'openai',
        modelId: 'gpt-4o',
        type: 'text',
        settings: { temperature: 0.7 },
      });
    });

    it('parses "provider:model" format correctly', async () => {
      const result = await resolveModel('openai:gpt-4o');
      expect(result).toEqual({
        provider: 'openai',
        modelId: 'gpt-4o',
        type: 'text',
      });
    });

    it('parses "anthropic:claude-3-opus-20240229" correctly', async () => {
      const result = await resolveModel('anthropic:claude-3-opus-20240229');
      expect(result).toEqual({
        provider: 'anthropic',
        modelId: 'claude-3-opus-20240229',
        type: 'text',
      });
    });

    it('infers embedding type from model name containing "embed"', async () => {
      const result = await resolveModel('openai:text-embedding-3-small');
      expect(result.type).toBe('embedding');
    });

    it('treats known bare model ID as its provider', async () => {
      const result = await resolveModel('gpt-4o');
      expect(result).toEqual({
        provider: 'openai',
        modelId: 'gpt-4o',
        type: 'text',
      });
    });

    it('treats known Claude model as anthropic provider', async () => {
      const result = await resolveModel('claude-3-opus-20240229');
      expect(result.provider).toBe('anthropic');
    });

    it('falls back to default model when alias not found and format not recognized', async () => {
      const result = await resolveModel('some-random-string');
      expect(result).toEqual({
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        type: 'text',
      });
    });

    it('returns settings as undefined when DB alias has null defaultSettings', async () => {
      mockLimit.mockResolvedValueOnce([
        {
          modelId: 'gpt-4o-mini',
          type: 'text',
          defaultSettings: null,
          providerSlug: 'openai',
        },
      ]);

      const result = await resolveModel('cheap');
      expect(result.settings).toBeUndefined();
    });
  });

  describe('resolveEmbeddingModel()', () => {
    it('returns default embedding model when no argument given', async () => {
      const result = await resolveEmbeddingModel();
      expect(result).toEqual({
        provider: 'openai',
        modelId: 'text-embedding-3-small',
        type: 'embedding',
      });
    });

    it('resolves a specific embedding model alias', async () => {
      mockLimit.mockResolvedValueOnce([
        {
          modelId: 'text-embedding-3-large',
          type: 'embedding',
          defaultSettings: null,
          providerSlug: 'openai',
        },
      ]);

      const result = await resolveEmbeddingModel('large-embed');
      expect(result.modelId).toBe('text-embedding-3-large');
    });
  });
});
