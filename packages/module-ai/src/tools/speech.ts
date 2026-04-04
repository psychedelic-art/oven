import { providerRegistry } from '../engine/provider-registry';
import { resolveModel } from '../engine/model-resolver';

export interface GenerateSpeechParams {
  text: string;
  voice?: string;
  model?: string;
  outputFormat?: string;
  speed?: number;
  tenantId?: number;
}

export interface GenerateSpeechResult {
  audioUrl: string;
  format: string;
  latencyMs: number;
  model: string;
  provider: string;
}

export async function aiGenerateSpeech(params: GenerateSpeechParams): Promise<GenerateSpeechResult> {
  const {
    text,
    voice = 'alloy',
    model = 'tts',
    outputFormat = 'mp3',
    speed = 1.0,
  } = params;

  const startTime = Date.now();

  try {
    const { experimental_generateSpeech: generateSpeech } = await import('ai');

    // Resolve alias → provider + modelId (same pattern as all other tools)
    const resolved = await resolveModel(model);
    const provider = await providerRegistry.resolve(resolved.provider) as any;

    // Get the speech model from the resolved provider
    // Different providers expose speech differently
    const speechModel = provider.speech?.(resolved.modelId)
      ?? provider.speechModel?.(resolved.modelId)
      ?? provider(resolved.modelId);

    const result = await generateSpeech({
      model: speechModel,
      text,
      voice,
      outputFormat,
      speed,
    });

    const latencyMs = Date.now() - startTime;

    // Convert audio to base64 data URL
    const audioBase64 = Buffer.from(result.audio.data).toString('base64');
    const mimeType = outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';
    const audioUrl = `data:${mimeType};base64,${audioBase64}`;

    // Try to persist to file storage for permanent URL
    try {
      const { processUpload } = await import('@oven/module-files/engine/upload-processor');
      const file = await processUpload({
        base64: audioUrl,
        filename: `speech-${Date.now()}.${outputFormat}`,
        mimeType,
        folder: 'ai-audio',
        sourceModule: 'ai',
      });
      return { audioUrl: file.publicUrl, format: outputFormat, latencyMs, model: resolved.modelId, provider: resolved.provider };
    } catch {
      // File storage not available, return data URL
      return { audioUrl, format: outputFormat, latencyMs, model: resolved.modelId, provider: resolved.provider };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Speech generation failed';
    throw new Error(`TTS failed: ${message}`);
  }
}
