import type { LanguageModelV1, LanguageModelV1Middleware } from 'ai';
import { wrapLanguageModel } from 'ai';
import { trackAIUsage, checkAIQuota } from './usage-tracker';
import { evaluateGuardrails } from './guardrail-engine';

// ─── Types ───────────────────────────────────────────────────

export interface AIMiddlewareContext {
  tenantId?: number;
  toolName?: string;
  metadata?: Record<string, unknown>;
}

// ─── Middleware Factory ──────────────────────────────────────

/**
 * Create a Vercel AI SDK middleware chain that wraps AI calls with:
 * - Quota checking (before)
 * - Input guardrails (before)
 * - Usage tracking (after)
 * - Budget enforcement (after)
 */
export function createAIMiddleware(ctx: AIMiddlewareContext): LanguageModelV1Middleware {
  return {
    transformParams: async ({ params }) => {
      // 1. Check quota if tenantId is present
      if (ctx.tenantId) {
        const quota = await checkAIQuota(ctx.tenantId);
        if (!quota.allowed) {
          throw new Error(
            `AI quota exceeded for tenant ${ctx.tenantId}. ` +
            `Remaining tokens: ${quota.remaining}. ` +
            `Please upgrade your plan or wait for the next billing cycle.`
          );
        }
      }

      // 2. Input guardrails
      if (ctx.tenantId) {
        const promptText = extractPromptText(params);
        if (promptText) {
          const guardrailResult = await evaluateGuardrails(promptText, 'input', ctx.tenantId);
          if (!guardrailResult.passed && guardrailResult.action === 'block') {
            throw new Error(
              `Input blocked by guardrail: ${guardrailResult.message ?? 'Content policy violation'}`
            );
          }
        }
      }

      return params;
    },

    wrapGenerate: async ({ doGenerate, params }) => {
      const startTime = Date.now();
      const result = await doGenerate();
      const latencyMs = Date.now() - startTime;

      // Output guardrails
      if (ctx.tenantId && result.text) {
        const guardrailResult = await evaluateGuardrails(result.text, 'output', ctx.tenantId);
        if (!guardrailResult.passed && guardrailResult.action === 'block') {
          throw new Error(
            `Output blocked by guardrail: ${guardrailResult.message ?? 'Content policy violation'}`
          );
        }
      }

      // Track usage
      if (ctx.tenantId && result.usage) {
        await trackAIUsage({
          tenantId: ctx.tenantId,
          inputTokens: result.usage.promptTokens,
          outputTokens: result.usage.completionTokens,
          model: extractModelId(params),
          provider: extractProvider(params),
          latencyMs,
          toolName: ctx.toolName,
          metadata: ctx.metadata,
        });
      }

      return result;
    },

    wrapStream: async ({ doStream, params }) => {
      const startTime = Date.now();
      const { stream, ...rest } = await doStream();

      let inputTokens = 0;
      let outputTokens = 0;
      let accumulatedText = '';

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          // Accumulate token counts from stream chunks
          if (chunk.type === 'response-metadata' && chunk.usage) {
            inputTokens = chunk.usage.promptTokens ?? inputTokens;
            outputTokens = chunk.usage.completionTokens ?? outputTokens;
          }
          // Accumulate text for output guardrail evaluation
          if (chunk.type === 'text-delta' && chunk.textDelta) {
            accumulatedText += chunk.textDelta;
          }
          controller.enqueue(chunk);
        },
        async flush() {
          const latencyMs = Date.now() - startTime;

          // Output guardrails on accumulated stream text
          if (ctx.tenantId && accumulatedText) {
            const guardrailResult = await evaluateGuardrails(accumulatedText, 'output', ctx.tenantId);
            if (!guardrailResult.passed && guardrailResult.action === 'block') {
              // Note: Stream has already been sent to client. We log the violation
              // but cannot retroactively block. Future: use a buffered approach.
              await trackAIUsage({
                tenantId: ctx.tenantId,
                inputTokens,
                outputTokens,
                model: extractModelId(params),
                provider: extractProvider(params),
                latencyMs,
                toolName: ctx.toolName,
                status: 'guardrail_blocked',
                metadata: { ...ctx.metadata, guardrailViolation: guardrailResult.message },
              });
              return;
            }
          }

          // Track usage after stream completes
          if (ctx.tenantId && (inputTokens > 0 || outputTokens > 0)) {
            await trackAIUsage({
              tenantId: ctx.tenantId,
              inputTokens,
              outputTokens,
              model: extractModelId(params),
              provider: extractProvider(params),
              latencyMs,
              toolName: ctx.toolName,
              metadata: ctx.metadata,
            });
          }
        },
      });

      return {
        stream: stream.pipeThrough(transformStream),
        ...rest,
      };
    },
  };
}

/**
 * Wrap a language model with the OVEN middleware chain.
 */
export function wrapWithMiddleware(
  model: LanguageModelV1,
  ctx: AIMiddlewareContext
): LanguageModelV1 {
  return wrapLanguageModel({
    model,
    middleware: createAIMiddleware(ctx),
  });
}

// ─── Helpers ─────────────────────────────────────────────────

function extractPromptText(params: Record<string, unknown>): string | null {
  // Extract text from the prompt parameter
  const prompt = params.prompt;
  if (typeof prompt === 'string') return prompt;

  // Handle message array format
  if (Array.isArray(prompt)) {
    return prompt
      .map((msg: Record<string, unknown>) => {
        if (typeof msg.content === 'string') return msg.content;
        if (Array.isArray(msg.content)) {
          return msg.content
            .filter((part: Record<string, unknown>) => part.type === 'text')
            .map((part: Record<string, unknown>) => part.text)
            .join(' ');
        }
        return '';
      })
      .join('\n');
  }

  return null;
}

function extractModelId(params: Record<string, unknown>): string {
  return (params.modelId as string) ?? 'unknown';
}

function extractProvider(params: Record<string, unknown>): string {
  return (params.provider as string) ?? 'unknown';
}
