import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { aiModelAliases, aiProviders } from '../schema';

// ─── Types ───────────────────────────────────────────────────

export interface ResolvedModel {
  provider: string;
  modelId: string;
  type: string;
  settings?: Record<string, unknown>;
}

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_TEXT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEXT_PROVIDER = 'openai';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_EMBEDDING_PROVIDER = 'openai';

// ─── Resolver ────────────────────────────────────────────────

/**
 * Resolve a model alias or provider:model string to a concrete provider + model.
 *
 * Resolution chain:
 * 1. Check `ai_model_aliases` table by alias
 * 2. Parse as "provider:model" (e.g., "openai:gpt-4o")
 * 3. Fall back to DEFAULT_TEXT_MODEL config
 */
export async function resolveModel(aliasOrModel: string): Promise<ResolvedModel> {
  // 1. Try alias lookup from DB
  const fromAlias = await resolveFromAlias(aliasOrModel);
  if (fromAlias) return fromAlias;

  // 2. Try "provider:model" format
  if (aliasOrModel.includes(':')) {
    const [provider, ...modelParts] = aliasOrModel.split(':');
    const modelId = modelParts.join(':');
    if (provider && modelId) {
      return {
        provider,
        modelId,
        type: inferModelType(modelId),
      };
    }
  }

  // 3. Try treating it as a bare model ID (assume default provider)
  if (isKnownModel(aliasOrModel)) {
    return {
      provider: inferProvider(aliasOrModel),
      modelId: aliasOrModel,
      type: inferModelType(aliasOrModel),
    };
  }

  // 4. Fall back to default
  return {
    provider: DEFAULT_TEXT_PROVIDER,
    modelId: DEFAULT_TEXT_MODEL,
    type: 'text',
  };
}

/**
 * Resolve specifically for embedding models.
 */
export async function resolveEmbeddingModel(aliasOrModel?: string): Promise<ResolvedModel> {
  if (aliasOrModel) {
    const resolved = await resolveModel(aliasOrModel);
    return resolved;
  }
  return {
    provider: DEFAULT_EMBEDDING_PROVIDER,
    modelId: DEFAULT_EMBEDDING_MODEL,
    type: 'embedding',
  };
}

// ─── Private helpers ─────────────────────────────────────────

async function resolveFromAlias(alias: string): Promise<ResolvedModel | null> {
  const db = getDb();

  const results = await db
    .select({
      modelId: aiModelAliases.modelId,
      type: aiModelAliases.type,
      defaultSettings: aiModelAliases.defaultSettings,
      providerSlug: aiProviders.slug,
    })
    .from(aiModelAliases)
    .innerJoin(aiProviders, eq(aiModelAliases.providerId, aiProviders.id))
    .where(
      and(
        eq(aiModelAliases.alias, alias),
        eq(aiModelAliases.enabled, true),
      )
    )
    .limit(1);

  const row = results[0];
  if (!row) return null;

  return {
    provider: row.providerSlug,
    modelId: row.modelId,
    type: row.type,
    settings: (row.defaultSettings as Record<string, unknown>) ?? undefined,
  };
}

function inferModelType(modelId: string): string {
  if (modelId.includes('embed')) return 'embedding';
  if (modelId.includes('dall-e') || modelId.includes('image')) return 'image';
  return 'text';
}

function inferProvider(modelId: string): string {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('text-embedding') || modelId.startsWith('dall-e')) {
    return 'openai';
  }
  if (modelId.startsWith('claude-')) {
    return 'anthropic';
  }
  if (modelId.startsWith('gemini-') || modelId.startsWith('models/')) {
    return 'google';
  }
  return DEFAULT_TEXT_PROVIDER;
}

const KNOWN_MODEL_PREFIXES = ['gpt-', 'o1', 'claude-', 'gemini-', 'text-embedding', 'dall-e'];

function isKnownModel(id: string): boolean {
  return KNOWN_MODEL_PREFIXES.some((prefix) => id.startsWith(prefix));
}
