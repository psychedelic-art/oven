import { providerRegistry } from '../engine/provider-registry';
import { resolveModel } from '../engine/model-resolver';
import { trackAIUsage } from '../engine/usage-tracker';
import { eventBus } from '@oven/module-registry';
import { decrypt, isEncrypted } from '../engine/encryption';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { aiProviders } from '../schema';

// ─── Types ───────────────────────────────────────────────────

export interface GenerateImageParams {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  tenantId?: number;
  metadata?: Record<string, unknown>;
}

export interface GenerateImageResult {
  url: string;
  revisedPrompt?: string;
}

// ─── Image Pricing (per image, in cents) ─────────────────────

const IMAGE_PRICING: Record<string, Record<string, number>> = {
  'dall-e-3': {
    '1024x1024:standard': 4,
    '1024x1024:hd': 8,
    '1024x1792:standard': 8,
    '1792x1024:standard': 8,
    '1024x1792:hd': 12,
    '1792x1024:hd': 12,
  },
  'dall-e-2': {
    '1024x1024': 2,
    '512x512': 2,
    '256x256': 2,
  },
};

// ─── Provider-specific API URLs ─────────────────────────────

const PROVIDER_IMAGE_ENDPOINTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1/images/generations',
  google: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
};

/**
 * Get the API key for a provider — from DB (decrypted) or env var fallback.
 */
async function getProviderApiKey(providerSlug: string, providerType: string): Promise<string> {
  // Try DB first
  try {
    const db = getDb();
    const [provider] = await db
      .select({ apiKeyEncrypted: aiProviders.apiKeyEncrypted })
      .from(aiProviders)
      .where(and(eq(aiProviders.slug, providerSlug), eq(aiProviders.enabled, true)))
      .limit(1);

    if (provider?.apiKeyEncrypted) {
      return isEncrypted(provider.apiKeyEncrypted)
        ? decrypt(provider.apiKeyEncrypted)
        : provider.apiKeyEncrypted;
    }
  } catch {
    // DB not available, fall through to env
  }

  // Env var fallback
  const envMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    google: 'GOOGLE_GENERATIVE_AI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
  };
  const envKey = process.env[envMap[providerType] ?? ''];
  if (envKey) return envKey;

  throw new Error(
    `No API key found for provider "${providerSlug}". ` +
    `Configure it in Dashboard → AI Providers, or set ${envMap[providerType] ?? providerType.toUpperCase() + '_API_KEY'} env var.`
  );
}

// ─── OpenAI Image Generation ─────────────────────────────────

async function generateOpenAIImage(
  apiKey: string,
  modelId: string,
  prompt: string,
  size: string,
  quality: string
): Promise<GenerateImageResult> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      prompt,
      n: 1,
      size,
      quality,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error((error as any)?.error?.message ?? `OpenAI image generation failed (${response.status})`);
  }

  const data = await response.json() as { data: Array<{ url: string; revised_prompt?: string }> };
  return {
    url: data.data[0].url,
    revisedPrompt: data.data[0].revised_prompt,
  };
}

// ─── Google Gemini Image Generation ──────────────────────────

async function generateGoogleImage(
  apiKey: string,
  modelId: string,
  prompt: string
): Promise<GenerateImageResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  // Gemini image models require both TEXT and IMAGE in responseModalities.
  // Add a system instruction to ensure image generation (not just text response).
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `Generate an image: ${prompt}` }],
        },
      ],
      systemInstruction: {
        parts: [{ text: 'You are an image generation assistant. Always generate and return an image based on the user description. Do not ask clarifying questions — use your best interpretation to create the image immediately.' }],
      },
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const errorMsg = (error as any)?.error?.message ?? `Google image generation failed (${response.status})`;
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const candidates = data.candidates ?? [];
  const parts = candidates[0]?.content?.parts ?? [];

  // Find the image part (may be at any position in the parts array)
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  const textPart = parts.find((p: any) => p.text);

  if (imagePart?.inlineData) {
    const { mimeType, data: b64Data } = imagePart.inlineData;
    return {
      url: `data:${mimeType};base64,${b64Data}`,
      revisedPrompt: textPart?.text,
    };
  }

  // If no image part, the model returned text only — include the text in the error
  const textResponse = textPart?.text ?? 'No response from model';
  throw new Error(
    `Model did not return an image. This may happen if the prompt is too vague or the model requires more detail. ` +
    `Model response: "${textResponse.slice(0, 300)}"`
  );
}

// ─── Public API ──────────────────────────────────────────────

export async function aiGenerateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  const {
    prompt,
    model: modelAlias = 'dalle3',
    size = '1024x1024',
    quality = 'standard',
    tenantId,
    metadata,
  } = params;

  const startTime = Date.now();
  const resolved = await resolveModel(modelAlias);
  const apiKey = await getProviderApiKey(resolved.provider, resolved.provider);

  let result: GenerateImageResult;

  switch (resolved.provider) {
    case 'openai':
      result = await generateOpenAIImage(apiKey, resolved.modelId, prompt, size, quality);
      break;
    case 'google':
      result = await generateGoogleImage(apiKey, resolved.modelId, prompt);
      break;
    default:
      throw new Error(
        `Image generation is not supported for provider "${resolved.provider}". ` +
        `Supported: openai, google.`
      );
  }

  const latencyMs = Date.now() - startTime;

  // Calculate cost
  const pricingKey = quality !== 'standard' ? `${size}:${quality}` : `${size}:standard`;
  const costCents = IMAGE_PRICING[resolved.modelId]?.[pricingKey] ?? 4;

  // Track usage
  if (tenantId) {
    await trackAIUsage({
      tenantId,
      inputTokens: 0,
      outputTokens: 0,
      model: resolved.modelId,
      provider: resolved.provider,
      latencyMs,
      toolName: 'ai.generateImage',
      metadata: { ...metadata, size, quality, costCents },
    });
  }

  return result;
}
