import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { aiProviders } from '../schema';
import { providerRegistry } from '../engine/provider-registry';
import {
  assertCallableProvider,
  ProviderNotCallableError,
} from '../engine/provider-types';

// POST /api/ai-providers/[id]/test — Test provider connection
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [provider] = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.id, parseInt(id, 10)));

  if (!provider) return notFound('Provider not found');

  if (!provider.apiKeyEncrypted) {
    return NextResponse.json(
      { ok: false, error: 'No API key configured for this provider' },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    // Clear cache to force fresh resolution with current key
    providerRegistry.clearCache();

    // Try to resolve the provider (this tests DB key decryption + SDK creation)
    const sdkProvider = await providerRegistry.resolve(provider.slug);

    // Narrow the unknown return value to a callable SDK provider.
    // Throws ProviderNotCallableError on null/undefined/non-callable,
    // which is the caught-and-reported failure mode below.
    assertCallableProvider(sdkProvider, provider.slug);

    // For a deeper test, try a minimal API call based on provider type
    let testResult = 'Provider SDK initialized successfully';

    if (provider.type === 'openai') {
      const { generateText } = await import('ai');
      const model = sdkProvider('gpt-4o-mini');
      const result = await generateText({
        model,
        prompt: 'Say "ok"',
        maxTokens: 3,
      });
      testResult = `Connected. Model responded: "${result.text}"`;
    } else if (provider.type === 'anthropic') {
      const { generateText } = await import('ai');
      const model = sdkProvider('claude-sonnet-4-20250514');
      const result = await generateText({
        model,
        prompt: 'Say "ok"',
        maxTokens: 3,
      });
      testResult = `Connected. Model responded: "${result.text}"`;
    } else if (provider.type === 'google') {
      const { generateText } = await import('ai');
      const model = sdkProvider('gemini-2.0-flash');
      const result = await generateText({
        model,
        prompt: 'Say "ok"',
        maxTokens: 3,
      });
      testResult = `Connected. Model responded: "${result.text}"`;
    }

    return NextResponse.json({
      ok: true,
      message: testResult,
      latencyMs: Date.now() - startTime,
      provider: provider.slug,
      type: provider.type,
    });
  } catch (err) {
    // ProviderNotCallableError surfaces as a 502 with the typed message;
    // generic errors (auth, network, SDK) fall through to the same shape.
    if (err instanceof ProviderNotCallableError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          latencyMs: Date.now() - startTime,
          provider: provider.slug,
        },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Connection test failed',
      latencyMs: Date.now() - startTime,
      provider: provider.slug,
    });
  }
}
