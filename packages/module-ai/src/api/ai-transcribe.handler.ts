import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { aiUsageLogs } from '../schema';
import { providerRegistry } from '../engine/provider-registry';
import {
  assertCallableProvider,
  ProviderNotCallableError,
  ProviderSubClientNotCallableError,
  resolveSubClientModel,
} from '../engine/provider-types';

// POST /api/ai/transcribe — Speech-to-Text via Vercel AI SDK
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.audio || typeof body.audio !== 'string') {
    return badRequest('audio is required (base64 data URL or HTTP URL)');
  }

  const providerSlug = 'openai';
  const startTime = Date.now();

  try {
    const { experimental_transcribe: transcribe } = await import('ai');
    const openai = await providerRegistry.resolve(providerSlug);

    // F-05-04: narrow the unknown resolver result to AiSdkProvider
    // and resolve the `.transcription` sub-client through the typed
    // helper. Both steps replace the `(openai as any)` cast + the
    // `.transcription?.(...) ?? openai(...)` fallback with a typed
    // shape guard that throws ProviderSubClientNotCallableError when
    // the SDK factory is missing its transcription sibling.
    assertCallableProvider(openai, providerSlug);
    const model = body.model ?? 'whisper-1';
    const transcriptionModel = resolveSubClientModel(
      openai,
      'transcription',
      model,
      providerSlug,
    );

    // Resolve audio input
    let audioInput: string | Uint8Array = body.audio;
    if (body.audio.startsWith('data:')) {
      // Strip data URL prefix and decode base64
      const base64 = body.audio.split(',')[1];
      audioInput = new Uint8Array(Buffer.from(base64, 'base64'));
    }

    const result = await transcribe({
      model: transcriptionModel,
      audio: audioInput,
    });

    const latencyMs = Date.now() - startTime;

    // Log usage
    try {
      const db = getDb();
      await db.insert(aiUsageLogs).values({
        tenantId: body.tenantId ?? 0,
        modelId: model,
        toolName: 'ai.transcribeAudio',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costCents: Math.ceil((result.durationInSeconds ?? 0) * 0.033),
        latencyMs: Math.round(latencyMs),
        status: 'success',
        requestMetadata: { language: result.language, durationSeconds: result.durationInSeconds },
      });
    } catch (logErr) {
      console.error('[ai-transcribe] Usage logging failed:', logErr instanceof Error ? logErr.message : logErr);
    }

    return NextResponse.json({
      text: result.text,
      segments: result.segments ?? [],
      language: result.language,
      durationInSeconds: result.durationInSeconds,
      latencyMs,
    });
  } catch (err) {
    // ProviderNotCallableError / ProviderSubClientNotCallableError surface
    // as 502 with the typed message and the sub-client name embedded,
    // making misconfigured providers self-diagnosing. Generic errors
    // (auth, network, SDK) fall through to the same shape.
    if (
      err instanceof ProviderNotCallableError ||
      err instanceof ProviderSubClientNotCallableError
    ) {
      return NextResponse.json(
        {
          error: err.message,
          provider: providerSlug,
          latencyMs: Date.now() - startTime,
        },
        { status: 502 },
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown transcription error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
