import { experimental_transcribe as transcribe } from 'ai';
import { providerRegistry } from '../engine/provider-registry';
import { resolveModel } from '../engine/model-resolver';

// ─── Types ───────────────────────────────────────────────────

export interface TranscribeAudioParams {
  audio: string;       // base64 data URL or HTTP URL
  model?: string;      // default 'whisper-1'
  language?: string;
  tenantId?: number;
  metadata?: Record<string, unknown>;
}

export interface TranscribeAudioResult {
  text: string;
  segments: Array<{
    text: string;
    startSecond: number;
    endSecond: number;
  }>;
  language?: string;
  durationInSeconds?: number;
  latencyMs: number;
  model: string;
  provider: string;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Transcribe audio using a speech-to-text model.
 * Currently supports OpenAI's Whisper via the AI SDK experimental transcribe API.
 */
export async function aiTranscribeAudio(
  params: TranscribeAudioParams
): Promise<TranscribeAudioResult> {
  const {
    audio,
    model: modelAlias = 'whisper-1',
    language,
    tenantId,
  } = params;

  const startTime = Date.now();

  // Resolve model — for transcription, we need the OpenAI provider directly
  const resolved = await resolveModel(modelAlias);
  const provider = await providerRegistry.resolve(resolved.provider) as any;

  // The provider's transcription() method creates a TranscriptionModelV1
  if (typeof provider.transcription !== 'function') {
    throw new Error(
      `Provider "${resolved.provider}" does not support transcription. ` +
      `Only OpenAI (whisper-1) is currently supported.`
    );
  }

  const transcriptionModel = provider.transcription(resolved.modelId);

  // Prepare audio input: handle base64 data URLs and HTTP URLs
  let audioInput: string | URL;
  if (audio.startsWith('http://') || audio.startsWith('https://')) {
    audioInput = new URL(audio);
  } else {
    // base64 data URL or raw base64 — pass as-is to AI SDK
    audioInput = audio;
  }

  // Call AI SDK transcribe
  const result = await transcribe({
    model: transcriptionModel,
    audio: audioInput,
    providerOptions: {
      openai: {
        ...(language ? { language } : {}),
        timestamp_granularities: ['segment'],
        response_format: 'verbose_json',
      },
    },
  });

  const latencyMs = Date.now() - startTime;

  // Map segments from the result
  const segments = (result.segments ?? []).map((seg) => ({
    text: seg.text,
    startSecond: seg.start,
    endSecond: seg.end,
  }));

  return {
    text: result.text,
    segments,
    language: result.language ?? undefined,
    durationInSeconds: result.durationInSeconds ?? undefined,
    latencyMs,
    model: resolved.modelId,
    provider: resolved.provider,
  };
}
