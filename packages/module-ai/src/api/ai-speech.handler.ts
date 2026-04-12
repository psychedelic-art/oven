import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { aiGenerateSpeech } from '../tools/speech';
import { aiUsageLogs } from '../schema';

// POST /api/ai/speech — Text-to-Speech via Vercel AI SDK
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.text || typeof body.text !== 'string' || body.text.trim() === '') {
    return badRequest('text is required and must be a non-empty string');
  }

  try {
    const result = await aiGenerateSpeech({
      text: body.text,
      voice: body.voice,
      model: body.model,
      outputFormat: body.outputFormat,
      speed: body.speed,
      tenantId: body.tenantId ?? undefined,
    });

    // Log usage
    try {
      const db = getDb();
      await db.insert(aiUsageLogs).values({
        tenantId: body.tenantId ?? 0,
        modelId: body.model ?? 'tts-1',
        toolName: 'ai.generateSpeech',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costCents: Math.ceil(body.text.length / 1000 * 1.5),
        latencyMs: Math.round(result.latencyMs),
        status: 'success',
        requestMetadata: { voice: body.voice, format: result.format },
      });
    } catch (logErr) {
      console.error('[ai-speech] Usage logging failed:', logErr instanceof Error ? logErr.message : logErr);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown TTS error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
