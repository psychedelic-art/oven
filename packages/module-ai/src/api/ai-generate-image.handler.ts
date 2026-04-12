import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { aiGenerateImage } from '../tools/generate-image';
import { aiUsageLogs } from '../schema';

const VALID_SIZES = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'];
const VALID_QUALITIES = ['standard', 'hd'];

/**
 * Persist an image to file storage for a permanent URL.
 * Handles both base64 data URLs (Gemini) and HTTP URLs (OpenAI, which expire).
 * Returns the permanent URL, or the original on failure (graceful degradation).
 */
async function persistImage(
  imageUrl: string,
  model: string,
  tenantId?: number
): Promise<string> {
  try {
    const { processUpload } = await import('@oven/module-files/engine/upload-processor');

    const isBase64 = imageUrl.startsWith('data:');
    const mimeType = isBase64
      ? (imageUrl.match(/^data:([^;]+);/)?.[1] ?? 'image/png')
      : 'image/png';
    const ext = mimeType.split('/')[1] ?? 'png';
    const filename = `${model}-${Date.now()}.${ext}`;

    const result = await processUpload({
      ...(isBase64 ? { base64: imageUrl } : { url: imageUrl }),
      filename,
      mimeType,
      folder: 'ai-images',
      tenantId,
      sourceModule: 'ai',
    });

    return result.publicUrl;
  } catch {
    // File storage not available or upload failed — return original URL
    return imageUrl;
  }
}

// POST /api/ai/generate-image — Generate image via AI provider
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
    return badRequest('prompt is required and must be a non-empty string');
  }

  if (body.size && !VALID_SIZES.includes(body.size)) {
    return badRequest(`size must be one of: ${VALID_SIZES.join(', ')}`);
  }

  if (body.quality && !VALID_QUALITIES.includes(body.quality)) {
    return badRequest(`quality must be one of: ${VALID_QUALITIES.join(', ')}`);
  }

  try {
    const result = await aiGenerateImage({
      prompt: body.prompt,
      model: body.model,
      size: body.size,
      quality: body.quality,
      tenantId: body.tenantId ?? undefined,
    });

    // Persist image to file storage for a permanent URL
    const persistedUrl = await persistImage(
      result.url,
      body.model ?? 'dall-e-3',
      body.tenantId
    );

    // Log usage
    try {
      const db = getDb();
      await db.insert(aiUsageLogs).values({
        tenantId: body.tenantId ?? 0,
        modelId: body.model ?? 'dall-e-3',
        toolName: 'ai.generateImage',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costCents: 4,
        latencyMs: 0,
        status: 'success',
        requestMetadata: { prompt: body.prompt.slice(0, 200), size: body.size, quality: body.quality },
      });
    } catch (logErr) {
      console.error('[ai-generate-image] Usage logging failed:', logErr instanceof Error ? logErr.message : logErr);
    }

    return NextResponse.json({
      url: persistedUrl,
      revisedPrompt: result.revisedPrompt,
      model: body.model ?? 'dall-e-3',
      size: body.size ?? '1024x1024',
      quality: body.quality ?? 'standard',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown image generation error';
    return NextResponse.json(
      { error: message, model: body.model ?? 'dall-e-3' },
      { status: 502 }
    );
  }
}
