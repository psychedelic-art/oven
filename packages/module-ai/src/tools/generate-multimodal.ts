import { generateText } from 'ai';
import { providerRegistry } from '../engine/provider-registry';
import { resolveModel } from '../engine/model-resolver';
import { wrapWithMiddleware } from '../engine/middleware';
import { calculateCost } from '../engine/cost-calculator';
import type { AICallResult } from '../types';

// ─── Types ───────────────────────────────────────────────────

export interface MultimodalContentPart {
  type: 'text' | 'image' | 'file';
  text?: string;
  image?: string;       // base64 or URL
  mimeType?: string;
  data?: string;        // URL for file parts (video)
}

export interface MultimodalMessage {
  role: 'user' | 'assistant';
  content: MultimodalContentPart[];
}

export interface GenerateTextWithImagesParams {
  messages: MultimodalMessage[];
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tenantId?: number;
  toolName?: string;
  metadata?: Record<string, unknown>;
}

export interface DescribeVideoParams {
  videoUrl: string;
  prompt?: string;
  model?: string;
  tenantId?: number;
  metadata?: Record<string, unknown>;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Convert our MultimodalMessage[] to the AI SDK content parts format.
 */
function toAISDKMessages(messages: MultimodalMessage[]) {
  return messages.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content.map((part) => {
      if (part.type === 'text') {
        return { type: 'text' as const, text: part.text ?? '' };
      }
      if (part.type === 'image') {
        return {
          type: 'image' as const,
          image: part.image ?? '',
          mimeType: part.mimeType,
        };
      }
      if (part.type === 'file') {
        return {
          type: 'file' as const,
          data: part.data ?? '',
          mimeType: part.mimeType ?? 'video/mp4',
        };
      }
      return { type: 'text' as const, text: '' };
    }),
  }));
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Vision: generate text from a conversation that includes images.
 * Messages use content parts (text + image) in the AI SDK format.
 */
export async function aiGenerateTextWithImages(
  params: GenerateTextWithImagesParams
): Promise<AICallResult> {
  const {
    messages,
    system,
    model: modelAlias,
    temperature,
    maxTokens,
    tenantId,
    toolName = 'ai.generateTextWithImages',
    metadata,
  } = params;

  const startTime = Date.now();

  // Resolve model (default to a vision-capable model)
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

  // Convert messages to AI SDK format
  const sdkMessages = toAISDKMessages(messages);

  // Call AI SDK
  const result = await generateText({
    model: languageModel,
    messages: sdkMessages as Parameters<typeof generateText>[0]['messages'],
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
 * Video understanding: describe/analyze a video using a multimodal model.
 * The video URL is passed as a file content part with video mimeType.
 */
export async function aiDescribeVideo(
  params: DescribeVideoParams
): Promise<AICallResult> {
  const {
    videoUrl,
    prompt = 'Describe the contents of this video in detail.',
    model: modelAlias,
    tenantId,
    metadata,
  } = params;

  const startTime = Date.now();

  // Resolve model (default to a vision-capable model)
  const resolved = await resolveModel(modelAlias ?? 'fast');
  const provider = await providerRegistry.resolve(resolved.provider) as (id: string) => unknown;

  // Get the language model instance
  let languageModel = provider(resolved.modelId) as Parameters<typeof generateText>[0]['model'];

  const toolName = 'ai.describeVideo';

  // Wrap with middleware if tenantId is present
  if (tenantId) {
    languageModel = wrapWithMiddleware(
      languageModel as import('ai').LanguageModelV1,
      { tenantId, toolName, metadata }
    ) as typeof languageModel;
  }

  // Build message with video file part + text prompt
  const messages = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'file' as const,
          data: videoUrl,
          mimeType: 'video/mp4',
        },
        {
          type: 'text' as const,
          text: prompt,
        },
      ],
    },
  ];

  // Call AI SDK
  const result = await generateText({
    model: languageModel,
    messages: messages as Parameters<typeof generateText>[0]['messages'],
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
