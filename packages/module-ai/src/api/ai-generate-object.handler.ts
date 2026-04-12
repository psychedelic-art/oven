import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { jsonSchema } from 'ai';
import { aiGenerateObject } from '../tools/generate-object';
import { aiUsageLogs } from '../schema';
import { parseGenerateObjectInput } from './_utils/generate-object-input';

// POST /api/ai/generate-object — Generate structured object via Vercel AI SDK
export async function POST(request: NextRequest) {
  const body = await request.json();

  // F-05-05: boundary validation via zod (parseGenerateObjectInput)
  // replaces the historical hand-rolled `typeof === 'string'` checks.
  // The verdict carries a typed `value` so the call below no longer
  // needs the `(schema as any)` escape hatch.
  const verdict = parseGenerateObjectInput(body);
  if (!verdict.ok) {
    return badRequest(verdict.reason);
  }
  const input = verdict.value;

  try {
    // Convert JSON Schema to AI-SDK Schema via the SDK's helper. The
    // resulting `Schema<unknown>` is now structurally accepted by
    // `aiGenerateObject`'s widened parameter type — no cast.
    const schema = jsonSchema(input.schema);

    const result = await aiGenerateObject({
      prompt: input.prompt,
      schema,
      model: input.model,
      system: input.system,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      tenantId: input.tenantId,
    });

    // Log usage
    try {
      const db = getDb();
      await db.insert(aiUsageLogs).values({
        tenantId: input.tenantId ?? 0,
        modelId: result.model,
        toolName: 'ai.generateObject',
        inputTokens: Math.round(result.tokens?.input ?? 0),
        outputTokens: Math.round(result.tokens?.output ?? 0),
        totalTokens: Math.round((result.tokens?.input ?? 0) + (result.tokens?.output ?? 0)),
        costCents: result.costCents ?? 0,
        latencyMs: Math.round(result.latencyMs ?? 0),
        status: 'success',
        requestMetadata: { prompt: input.prompt.slice(0, 200), provider: result.provider },
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
      { error: message, model: input.model ?? 'default' },
      { status: 502 }
    );
  }
}
