import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { aiProviders } from '../schema';
import { decrypt, isEncrypted } from './encryption';

// ─── Types ───────────────────────────────────────────────────

type ProviderFactory = () => unknown;

// Map provider type → env var name (for fallback)
const ENV_VAR_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
};

// ─── Registry ────────────────────────────────────────────────

class ProviderRegistry {
  private providers = new Map<string, ProviderFactory>();
  private instances = new Map<string, unknown>();

  /**
   * Register a named provider factory. The factory is called lazily
   * on first `resolve()`.
   */
  register(name: string, factory: ProviderFactory): void {
    this.providers.set(name, factory);
    this.instances.delete(name);
  }

  /**
   * Resolve a provider by name or alias.
   *
   * Resolution order (DB-first):
   * 1. Check in-memory cache
   * 2. Check DB `ai_providers` table (encrypted key → decrypt → create SDK provider)
   * 3. Fall back to env var (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
   * 4. Error with helpful message
   */
  async resolve(nameOrAlias: string): Promise<unknown> {
    // 1. Check cached instance
    if (this.instances.has(nameOrAlias)) {
      return this.instances.get(nameOrAlias)!;
    }

    // 2. Try DB first (primary source — keys configured via dashboard)
    const dbInstance = await this.resolveFromDb(nameOrAlias);
    if (dbInstance) {
      this.instances.set(nameOrAlias, dbInstance);
      return dbInstance;
    }

    // 3. Fall back to env var
    const envInstance = this.resolveFromEnv(nameOrAlias);
    if (envInstance) {
      this.instances.set(nameOrAlias, envInstance);
      return envInstance;
    }

    // 4. Check manually registered factory (for testing/custom providers)
    const factory = this.providers.get(nameOrAlias);
    if (factory) {
      const instance = factory();
      this.instances.set(nameOrAlias, instance);
      return instance;
    }

    throw new Error(
      `AI provider "${nameOrAlias}" is not configured. ` +
      `Add an API key via Dashboard → AI Providers, or set ${ENV_VAR_MAP[nameOrAlias] ?? nameOrAlias.toUpperCase() + '_API_KEY'} env var.`
    );
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  getAll(): Map<string, ProviderFactory> {
    return new Map(this.providers);
  }

  /**
   * Clear all cached instances (useful for testing or after key update).
   */
  clearCache(): void {
    this.instances.clear();
  }

  // ── Private: DB Resolution ──────────────────────────────────

  private async resolveFromDb(nameOrSlug: string): Promise<unknown | null> {
    let db: ReturnType<typeof getDb>;
    try {
      db = getDb();
    } catch {
      // DB not initialized yet (e.g., during module loading)
      return null;
    }

    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(
        and(
          eq(aiProviders.slug, nameOrSlug),
          eq(aiProviders.enabled, true),
        )
      )
      .limit(1);

    if (!provider) return null;

    // Get the API key — decrypt if encrypted, use as-is if plain text
    let apiKey = provider.apiKeyEncrypted;
    if (apiKey && isEncrypted(apiKey)) {
      try {
        apiKey = decrypt(apiKey);
      } catch {
        // Decryption failed — key may be corrupted or encryption key changed
        console.warn(`Failed to decrypt API key for provider "${nameOrSlug}". Re-enter the key via dashboard.`);
        return null;
      }
    }

    if (!apiKey) return null; // No key configured yet

    // Create provider from DB config
    switch (provider.type) {
      case 'openai':
        return createOpenAI({
          apiKey,
          ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
        });
      case 'anthropic':
        return createAnthropic({
          apiKey,
          ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
        });
      case 'google':
        return createGoogleGenerativeAI({
          apiKey,
          ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
        });
      default:
        // Custom provider — try as OpenAI-compatible (many providers use this format)
        return createOpenAI({
          apiKey,
          baseURL: provider.baseUrl ?? undefined,
        });
    }
  }

  // ── Private: Env Var Fallback ───────────────────────────────

  private resolveFromEnv(nameOrSlug: string): unknown | null {
    const envVar = ENV_VAR_MAP[nameOrSlug];
    if (!envVar) return null;

    const apiKey = process.env[envVar];
    if (!apiKey) return null;

    switch (nameOrSlug) {
      case 'openai':
        return createOpenAI({ apiKey });
      case 'anthropic':
        return createAnthropic({ apiKey });
      case 'google':
        return createGoogleGenerativeAI({ apiKey });
      default:
        return null;
    }
  }
}

// ─── Singleton ───────────────────────────────────────────────

export const providerRegistry = new ProviderRegistry();
