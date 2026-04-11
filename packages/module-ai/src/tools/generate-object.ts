import { generateObject, type Schema } from 'ai';
import type { z } from 'zod';
import { providerRegistry } from '../engine/provider-registry';
import { resolveModel } from '../engine/model-resolver';
import { wrapWithMiddleware } from '../engine/middleware';
import { calculateCost } from '../engine/cost-calculator';

// ─── Types ───────────────────────────────────────────────────

/**
 * Schema accepted by `aiGenerateObject`. Mirrors the union the AI SDK
 * itself accepts on `generateObject({ schema })`:
 *
 *   - `z.ZodSchema<T>` for callers who hand-write a Zod schema.
 *   - `Schema<T>` for callers who feed JSON Schema through the SDK's
 *     `jsonSchema(...)` helper at the boundary (e.g.
 *     `ai-generate-object.handler.ts` after F-05-05 boundary
 *     validation).
 *
 * Widening `GenerateObjectParams.schema` to this union is the change
 * that lets `ai-generate-object.handler.ts` drop its `as any` cast.
 */
export type GenerateObjectSchema<T> = z.ZodSchema<T> | Schema<T>;

export interface GenerateObjectParams<T> {
  prompt: string;
  schema: GenerateObjectSchema<T>;
  schemaName?: string;
  schemaDescription?: string;
  model?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  tenantId?: number;
  metadata?: Record<string, unknown>;
}

export interface GenerateObjectResult<T> {
  object: T;
  tokens: {
    input: number;
    output: number;
  };
  costCents: number;
  latencyMs: number;
  model: string;
  provider: string;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Generate a structured object that matches a Zod schema.
 * Uses the Vercel AI SDK's generateObject for guaranteed schema conformance.
 */
export async function aiGenerateObject<T>(
  params: GenerateObjectParams<T>
): Promise<GenerateObjectResult<T>> {
  const {
    prompt,
    schema,
    schemaName,
    schemaDescription,
    model: modelAlias,
    system,
    temperature,
    maxTokens,
    tenantId,
    metadata,
  } = params;

  const startTime = Date.now();

  // Resolve model
  const resolved = await resolveModel(modelAlias ?? 'smart');
  const provider = await providerRegistry.resolve(resolved.provider) as (id: string) => unknown;

  // Get the language model instance
  let languageModel = provider(resolved.modelId) as Parameters<typeof generateObject>[0]['model'];

  // Wrap with middleware if tenantId is present
  if (tenantId) {
    languageModel = wrapWithMiddleware(
      languageModel as import('ai').LanguageModelV1,
      { tenantId, toolName: 'ai.generateObject', metadata }
    ) as typeof languageModel;
  }

  // Call AI SDK
  const result = await generateObject({
    model: languageModel,
    schema,
    schemaName,
    schemaDescription,
    prompt,
    system,
    temperature: temperature ?? resolved.settings?.temperature as number | undefined,
    maxTokens: maxTokens ?? resolved.settings?.maxTokens as number | undefined,
  });

  const latencyMs = Date.now() - startTime;
  const inputTokens = result.usage?.promptTokens ?? 0;
  const outputTokens = result.usage?.completionTokens ?? 0;

  return {
    object: result.object,
    tokens: {
      input: inputTokens,
      output: outputTokens,
    },
    costCents: calculateCost(resolved.modelId, inputTokens, outputTokens),
    latencyMs,
    model: resolved.modelId,
    provider: resolved.provider,
  };
}
