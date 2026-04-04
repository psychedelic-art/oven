import { embed, embedMany } from 'ai';
import { providerRegistry } from '../engine/provider-registry';
import { resolveEmbeddingModel } from '../engine/model-resolver';

// ─── Types ───────────────────────────────────────────────────

export interface EmbedResult {
  embedding: number[];
  tokens: number;
}

export interface EmbedManyResult {
  embeddings: number[][];
  tokens: number;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Generate an embedding vector for a single text input.
 */
export async function aiEmbed(
  text: string,
  model?: string
): Promise<EmbedResult> {
  const resolved = await resolveEmbeddingModel(model);
  const provider = await providerRegistry.resolve(resolved.provider) as Record<string, (id: string) => unknown>;
  const embeddingModel = provider.textEmbeddingModel
    ? (provider as Record<string, (id: string) => unknown>).textEmbeddingModel(resolved.modelId)
    : provider.embedding
      ? (provider as Record<string, (id: string) => unknown>).embedding(resolved.modelId)
      : (() => { throw new Error(`Provider "${resolved.provider}" does not support embeddings`); })();

  const result = await embed({
    model: embeddingModel as Parameters<typeof embed>[0]['model'],
    value: text,
  });

  return {
    embedding: result.embedding,
    tokens: result.usage?.tokens ?? 0,
  };
}

/**
 * Generate embedding vectors for multiple text inputs in a single batch.
 */
export async function aiEmbedMany(
  texts: string[],
  model?: string
): Promise<EmbedManyResult> {
  if (texts.length === 0) {
    return { embeddings: [], tokens: 0 };
  }

  const resolved = await resolveEmbeddingModel(model);
  const provider = await providerRegistry.resolve(resolved.provider) as Record<string, (id: string) => unknown>;
  const embeddingModel = provider.textEmbeddingModel
    ? (provider as Record<string, (id: string) => unknown>).textEmbeddingModel(resolved.modelId)
    : provider.embedding
      ? (provider as Record<string, (id: string) => unknown>).embedding(resolved.modelId)
      : (() => { throw new Error(`Provider "${resolved.provider}" does not support embeddings`); })();

  const result = await embedMany({
    model: embeddingModel as Parameters<typeof embedMany>[0]['model'],
    values: texts,
  });

  return {
    embeddings: result.embeddings,
    tokens: result.usage?.tokens ?? 0,
  };
}
