import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { aiEmbed, aiEmbedMany } from '../tools/embed';
import { aiUsageLogs } from '../schema';

// POST /api/ai/embed — Generate embeddings via Vercel AI SDK
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.text) {
    return badRequest('text is required (string or string[])');
  }

  const isArray = Array.isArray(body.text);
  const texts: string[] = isArray ? body.text : [body.text];

  if (texts.length === 0 || texts.some((t: unknown) => typeof t !== 'string' || (t as string).trim() === '')) {
    return badRequest('text must be a non-empty string or array of non-empty strings');
  }

  const startTime = Date.now();
  const modelName = body.model ?? 'text-embedding-3-small';

  try {
    let responseData: Record<string, unknown>;

    if (isArray) {
      const result = await aiEmbedMany(texts, body.model);
      responseData = {
        embedding: result.embeddings,
        tokens: result.tokens,
        model: modelName,
        dimensions: result.embeddings[0]?.length ?? 0,
      };
    } else {
      const result = await aiEmbed(texts[0], body.model);
      responseData = {
        embedding: result.embedding,
        tokens: result.tokens,
        model: modelName,
        dimensions: result.embedding.length,
      };
    }

    // Log usage
    const latencyMs = Date.now() - startTime;
    try {
      const db = getDb();
      const tokens = typeof responseData.tokens === 'number' ? responseData.tokens : 0;
      await db.insert(aiUsageLogs).values({
        tenantId: body.tenantId ?? 0,
        modelId: modelName,
        toolName: 'ai.embed',
        inputTokens: tokens,
        outputTokens: 0,
        totalTokens: tokens,
        costCents: 0,
        latencyMs: latencyMs ?? 0,
        status: 'success',
      });
    } catch (logErr) {
      console.error('[ai-embed] Usage logging failed:', logErr instanceof Error ? logErr.message : logErr);
    }

    return NextResponse.json(responseData);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown embedding error';
    return NextResponse.json(
      { error: message, model: modelName },
      { status: 502 }
    );
  }
}
