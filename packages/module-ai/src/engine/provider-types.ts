/**
 * Shared types + type guards for SDK provider instances produced by
 * `providerRegistry.resolve()`.
 *
 * The Vercel AI SDK factories (`createOpenAI`, `createAnthropic`,
 * `createGoogleGenerativeAI`) all return an object that is *callable*
 * as `(modelId: string) => LanguageModelV1` and also carries a
 * collection of sub-clients (`.transcription`, `.embeddings`, etc.).
 * Because the concrete SDK return types diverge across packages and
 * the registry's `resolve()` has to return a single union, the
 * registry returns `unknown` and call sites narrow with the guard
 * below. This isolates the widening to ONE place and eliminates
 * every `as any` sprinkled across `packages/module-ai/src/api/`.
 *
 * F-05-03 (see `docs/modules/todo/oven-bug-sprint/sprint-05-handler-typesafety.md`).
 */

export interface AiSdkProvider {
  /** Callable factory producing a language model for a given model id. */
  (modelId: string): unknown;
  /**
   * Optional sub-client map. The AI SDK providers expose sibling
   * factories (`.transcription`, `.image`, `.embedding`) that are
   * themselves callable. Callers use shape guards to access these.
   */
  readonly [key: string]: unknown;
}

/**
 * Typed error raised when a provider that should be callable is not.
 * Downstream handlers can `instanceof` this to return a clean HTTP 502
 * without exposing internals via a generic `TypeError`.
 */
export class ProviderNotCallableError extends Error {
  readonly providerName: string;
  constructor(providerName: string) {
    super(
      `AI provider "${providerName}" resolved but is not a callable SDK instance. ` +
        `Check that the provider is configured in Dashboard → AI Providers and ` +
        `that the API key is valid.`,
    );
    this.name = 'ProviderNotCallableError';
    this.providerName = providerName;
  }
}

/**
 * Narrow an unknown resolver result to `AiSdkProvider`. Throws
 * `ProviderNotCallableError` when the value is null, undefined, or
 * not a function (which is the failure mode that previously
 * manifested as a runtime `TypeError: sdkProvider is not a function`
 * or was silenced by `(sdkProvider as any)(...)`).
 *
 * This is a user-defined type-guard via `asserts` so that TypeScript
 * narrows `sdkProvider` to `AiSdkProvider` on the statement after
 * the call — no casts required.
 */
export function assertCallableProvider(
  value: unknown,
  providerName: string,
): asserts value is AiSdkProvider {
  if (value === null || value === undefined) {
    throw new ProviderNotCallableError(providerName);
  }
  if (typeof value !== 'function') {
    throw new ProviderNotCallableError(providerName);
  }
}
