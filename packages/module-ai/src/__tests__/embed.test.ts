import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock AI SDK
vi.mock('ai', () => ({
  embed: vi.fn().mockResolvedValue({
    embedding: [0.1, 0.2, 0.3, 0.4],
    usage: { tokens: 15 },
  }),
  embedMany: vi.fn().mockResolvedValue({
    embeddings: [[0.1, 0.2], [0.3, 0.4]],
    usage: { tokens: 30 },
  }),
}));

vi.mock('../engine/provider-registry', () => ({
  providerRegistry: {
    resolve: vi.fn().mockResolvedValue({
      textEmbeddingModel: vi.fn((modelId: string) => ({ modelId, type: 'embedding' })),
    }),
  },
}));

vi.mock('../engine/model-resolver', () => ({
  resolveEmbeddingModel: vi.fn().mockResolvedValue({
    provider: 'openai',
    modelId: 'text-embedding-3-small',
    type: 'embedding',
  }),
}));

import { aiEmbed, aiEmbedMany } from '../tools/embed';
import { resolveEmbeddingModel } from '../engine/model-resolver';
import { embed, embedMany } from 'ai';

describe('aiEmbed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves embedding model and calls AI SDK embed', async () => {
    const result = await aiEmbed('Hello world');
    expect(resolveEmbeddingModel).toHaveBeenCalledWith(undefined);
    expect(embed).toHaveBeenCalled();
    expect(result.embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
  });

  it('returns token count from usage', async () => {
    const result = await aiEmbed('Hello world');
    expect(result.tokens).toBe(15);
  });

  it('uses custom model when provided', async () => {
    await aiEmbed('Test', 'text-embedding-3-large');
    expect(resolveEmbeddingModel).toHaveBeenCalledWith('text-embedding-3-large');
  });

  it('handles missing usage gracefully', async () => {
    vi.mocked(embed).mockResolvedValueOnce({
      embedding: [0.5, 0.6],
      usage: undefined as any,
    });
    const result = await aiEmbed('No usage');
    expect(result.tokens).toBe(0);
  });
});

describe('aiEmbedMany', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('embeds multiple texts in batch', async () => {
    const result = await aiEmbedMany(['Hello', 'World']);
    expect(embedMany).toHaveBeenCalled();
    expect(result.embeddings).toHaveLength(2);
  });

  it('returns aggregate token count', async () => {
    const result = await aiEmbedMany(['Hello', 'World']);
    expect(result.tokens).toBe(30);
  });

  it('returns empty result for empty input', async () => {
    const result = await aiEmbedMany([]);
    expect(result.embeddings).toEqual([]);
    expect(result.tokens).toBe(0);
    expect(embedMany).not.toHaveBeenCalled();
  });

  it('uses custom model when provided', async () => {
    await aiEmbedMany(['Test'], 'text-embedding-ada-002');
    expect(resolveEmbeddingModel).toHaveBeenCalledWith('text-embedding-ada-002');
  });
});
