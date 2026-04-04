import { NextRequest } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { aiStreamText } from '../tools/generate';

// POST /api/ai/stream — Stream text generation via Vercel AI SDK (SSE)
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
    return badRequest('prompt is required and must be a non-empty string');
  }

  if (body.temperature !== undefined && (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2)) {
    return badRequest('temperature must be a number between 0 and 2');
  }

  if (body.maxTokens !== undefined && (typeof body.maxTokens !== 'number' || body.maxTokens < 1)) {
    return badRequest('maxTokens must be a positive number');
  }

  try {
    const textStream = await aiStreamText({
      prompt: body.prompt,
      system: body.system,
      model: body.model,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      tenantId: body.tenantId ?? undefined,
    });

    // Convert text stream to SSE format
    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = textStream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const event = `data: ${JSON.stringify({ type: 'text-delta', textDelta: value })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
          // Send finish event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'finish', model: body.model ?? 'default' })}\n\n`)
          );
          controller.close();
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Stream error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown streaming error';
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`)
        );
        controller.close();
      },
    });

    return new Response(errorStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
