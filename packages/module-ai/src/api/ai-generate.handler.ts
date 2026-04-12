import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { aiGenerateText } from '../tools/generate';
import { aiUsageLogs } from '../schema';

// POST /api/ai/generate — Generate text via Vercel AI SDK
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
    return badRequest('prompt is required and must be a non-empty string');
  }

  if (body.temperature !== undefined && (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2)) {
    return badRequest('temperature must be a number between 0 and 2');
  }

  if (body.maxTokens !== undefined && (typeof body.maxTokens !== 'number' || body.maxTokens < 1)) {
    return badRequest('maxTokens must be a positive number');
  }

  try {
    const result = await aiGenerateText({
      prompt: body.prompt,
      system: body.system,
      model: body.model,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      tenantId: body.tenantId ?? undefined,
    });

    // Always log to ai_usage_logs (even without tenantId)
    try {
      const db = getDb();
      await db.insert(aiUsageLogs).values({
        tenantId: body.tenantId ?? 0,
        modelId: result.model ?? 'unknown',
        toolName: 'ai.generateText',
        inputTokens: Math.round(result.tokens?.input ?? 0),
        outputTokens: Math.round(result.tokens?.output ?? 0),
        totalTokens: Math.round(result.tokens?.total ?? 0),
        costCents: result.costCents ?? 0,
        latencyMs: Math.round(result.latencyMs ?? 0),
        status: 'success',
        requestMetadata: { prompt: body.prompt.slice(0, 200), provider: result.provider },
      });
    } catch (logErr) {
      console.error('[ai-generate] Usage logging failed:', logErr instanceof Error ? logErr.message : logErr);
    }

    eventBus.emit('ai.call.completed', {
      model: result.model,
      provider: result.provider,
      inputTokens: result.tokens.input,
      outputTokens: result.tokens.output,
      costCents: result.costCents,
      latencyMs: result.latencyMs,
    });

    return NextResponse.json({
      text: result.text,
      tokens: result.tokens,
      costCents: result.costCents,
      model: result.model,
      provider: result.provider,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI generation error';
    return NextResponse.json(
      { error: message, model: body.model ?? 'default' },
      { status: 502 }
    );
  }
}
