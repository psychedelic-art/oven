import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { jsonSchema } from 'ai';
import { aiGenerateObject } from '../tools/generate-object';
import { aiUsageLogs } from '../schema';

// POST /api/ai/generate-object — Generate structured object via Vercel AI SDK
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
    return badRequest('prompt is required and must be a non-empty string');
  }

  if (!body.schema || typeof body.schema !== 'object') {
    return badRequest('schema is required and must be a JSON schema object');
  }

  try {
    // Convert JSON Schema to Zod-compatible schema using AI SDK's jsonSchema helper
    const schema = jsonSchema(body.schema);

    const result = await aiGenerateObject({
      prompt: body.prompt,
      schema: schema as any,
      model: body.model,
      system: body.system,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      tenantId: body.tenantId ?? undefined,
    });

    // Log usage
    try {
      const db = getDb();
      await db.insert(aiUsageLogs).values({
        tenantId: body.tenantId ?? 0,
        modelId: result.model,
        toolName: 'ai.generateObject',
        inputTokens: Math.round(result.tokens?.input ?? 0),
        outputTokens: Math.round(result.tokens?.output ?? 0),
        totalTokens: Math.round((result.tokens?.input ?? 0) + (result.tokens?.output ?? 0)),
        costCents: result.costCents ?? 0,
        latencyMs: Math.round(result.latencyMs ?? 0),
        status: 'success',
        requestMetadata: { prompt: body.prompt.slice(0, 200), provider: result.provider },
      });
    } catch (logErr) {
      console.error('[ai-generate-object] Usage logging failed:', logErr instanceof Error ? logErr.message : logErr);
    }

    return NextResponse.json({
      object: result.object,
      tokens: result.tokens,
      costCents: result.costCents,
      model: result.model,
      provider: result.provider,
      latencyMs: result.latencyMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown structured output error';
    return NextResponse.json(
      { error: message, model: body.model ?? 'default' },
      { status: 502 }
    );
  }
}
