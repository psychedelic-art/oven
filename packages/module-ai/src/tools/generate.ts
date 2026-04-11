import { generateText, streamText } from 'ai';
import { providerRegistry } from '../engine/provider-registry';
import { resolveModel } from '../engine/model-resolver';
import { wrapWithMiddleware } from '../engine/middleware';
import { calculateCost } from '../engine/cost-calculator';
import type { AICallResult } from '../types';

// ─── Types ───────────────────────────────────────────────────

export interface GenerateTextParams {
  prompt: string;
  model?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  tenantId?: number;
  toolName?: string;
  metadata?: Record<string, unknown>;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Generate text using an AI model. Resolves model aliases, applies middleware
 * (quota check, usage tracking, guardrails), and returns the result.
 */
export async function aiGenerateText(params: GenerateTextParams): Promise<AICallResult> {
  const {
    prompt,
    model: modelAlias,
    system,
    temperature,
    maxTokens,
    tenantId,
    toolName = 'ai.generateText',
    metadata,
  } = params;

  const startTime = Date.now();

  // Resolve model
  const resolved = await resolveModel(modelAlias ?? 'fast');
  const provider = await providerRegistry.resolve(resolved.provider) as (id: string) => unknown;

  // Get the language model instance
  let languageModel = provider(resolved.modelId) as Parameters<typeof generateText>[0]['model'];

  // Wrap with middleware if tenantId is present
  if (tenantId) {
    languageModel = wrapWithMiddleware(
      languageModel as import('ai').LanguageModelV1,
      { tenantId, toolName, metadata }
    ) as typeof languageModel;
  }

  // Call AI SDK
  const result = await generateText({
    model: languageModel,
    prompt,
    system,
    temperature: temperature ?? resolved.settings?.temperature as number | undefined,
    maxTokens: maxTokens ?? resolved.settings?.maxTokens as number | undefined,
  });

  const latencyMs = Date.now() - startTime;
  const inputTokens = result.usage?.promptTokens ?? 0;
  const outputTokens = result.usage?.completionTokens ?? 0;

  return {
    text: result.text,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    },
    costCents: calculateCost(resolved.modelId, inputTokens, outputTokens),
    latencyMs,
    model: resolved.modelId,
    provider: resolved.provider,
  };
}

/**
 * Stream text from an AI model. Returns a ReadableStream of text chunks.
 */
export async function aiStreamText(params: GenerateTextParams): Promise<ReadableStream<string>> {
  const {
    prompt,
    model: modelAlias,
    system,
    temperature,
    maxTokens,
    tenantId,
    toolName = 'ai.streamText',
    metadata,
  } = params;

  // Resolve model
  const resolved = await resolveModel(modelAlias ?? 'fast');
  const provider = await providerRegistry.resolve(resolved.provider) as (id: string) => unknown;

  // Get the language model instance
  let languageModel = provider(resolved.modelId) as Parameters<typeof streamText>[0]['model'];

  // Wrap with middleware if tenantId is present
  if (tenantId) {
    languageModel = wrapWithMiddleware(
      languageModel as import('ai').LanguageModelV1,
      { tenantId, toolName, metadata }
    ) as typeof languageModel;
  }

  // Call AI SDK streamText
  const result = streamText({
    model: languageModel,
    prompt,
    system,
    temperature: temperature ?? resolved.settings?.temperature as number | undefined,
    maxTokens: maxTokens ?? resolved.settings?.maxTokens as number | undefined,
  });

  return result.textStream as unknown as ReadableStream<string>;
}
