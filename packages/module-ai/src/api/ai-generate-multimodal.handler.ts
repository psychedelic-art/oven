import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { aiUsageLogs } from '../schema';
import { providerRegistry } from '../engine/provider-registry';
import { resolveModel } from '../engine/model-resolver';
import { calculateCost } from '../engine/cost-calculator';

// POST /api/ai/generate-multimodal — Vision: text + images input
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return badRequest('messages array is required with at least one message');
  }

  try {
    const { generateText } = await import('ai');
    const resolved = await resolveModel(body.model ?? 'smart');
    const provider = await providerRegistry.resolve(resolved.provider) as (id: string) => unknown;
    const languageModel = provider(resolved.modelId) as Parameters<typeof generateText>[0]['model'];

    const startTime = Date.now();

    const result = await generateText({
      model: languageModel,
      messages: body.messages,
      system: body.system,
      temperature: body.temperature ?? resolved.settings?.temperature as number | undefined,
      maxTokens: body.maxTokens ?? resolved.settings?.maxTokens as number | undefined,
    });

    const latencyMs = Date.now() - startTime;
    const inputTokens = result.usage?.promptTokens ?? 0;
    const outputTokens = result.usage?.completionTokens ?? 0;
    const costCents = calculateCost(resolved.modelId, inputTokens, outputTokens);

    // Log usage
    try {
      const db = getDb();
      await db.insert(aiUsageLogs).values({
        tenantId: body.tenantId ?? 0,
        modelId: resolved.modelId,
        toolName: 'ai.generateTextWithImages',
        inputTokens: Math.round(inputTokens),
        outputTokens: Math.round(outputTokens),
        totalTokens: Math.round(inputTokens + outputTokens),
        costCents,
        latencyMs: Math.round(latencyMs),
        status: 'success',
        requestMetadata: { provider: resolved.provider },
      });
    } catch (logErr) {
      console.error('[ai-multimodal] Usage logging failed:', logErr instanceof Error ? logErr.message : logErr);
    }

    return NextResponse.json({
      text: result.text,
      tokens: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
      costCents,
      model: resolved.modelId,
      provider: resolved.provider,
      latencyMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown multimodal error';
    return NextResponse.json({ error: message, model: body.model ?? 'default' }, { status: 502 });
  }
}
