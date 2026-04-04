import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { aiUsageLogs } from '../schema';
import { providerRegistry } from '../engine/provider-registry';
import { resolveModel } from '../engine/model-resolver';
import { calculateCost } from '../engine/cost-calculator';

// POST /api/ai/describe-video — Video understanding via file input
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.videoUrl || typeof body.videoUrl !== 'string') {
    return badRequest('videoUrl is required');
  }

  try {
    const { generateText } = await import('ai');
    const resolved = await resolveModel(body.model ?? 'smart');
    const provider = await providerRegistry.resolve(resolved.provider) as (id: string) => unknown;
    const languageModel = provider(resolved.modelId) as Parameters<typeof generateText>[0]['model'];

    const startTime = Date.now();

    const result = await generateText({
      model: languageModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'file', data: body.videoUrl, mimeType: body.mimeType ?? 'video/mp4' },
            { type: 'text', text: body.prompt ?? 'Describe this video in detail.' },
          ],
        },
      ],
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
        toolName: 'ai.describeVideo',
        inputTokens: Math.round(inputTokens),
        outputTokens: Math.round(outputTokens),
        totalTokens: Math.round(inputTokens + outputTokens),
        costCents,
        latencyMs: Math.round(latencyMs),
        status: 'success',
      });
    } catch (logErr) {
      console.error('[ai-describe-video] Usage logging failed:', logErr instanceof Error ? logErr.message : logErr);
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
    const message = err instanceof Error ? err.message : 'Unknown video description error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
