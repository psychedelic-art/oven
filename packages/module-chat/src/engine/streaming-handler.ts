import type { StreamEvent } from '../types';

// ─── Format a single event as SSE ──────────────────────────

export function formatSSEEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ─── Transform async iterable to SSE string chunks ─────────

export async function* createSSEStream(
  events: AsyncIterable<StreamEvent>,
): AsyncGenerator<string> {
  for await (const event of events) {
    yield formatSSEEvent(event);
  }
}

// ─── Create SSE Response from event stream ──────────────────

export function createSSEResponse(
  events: AsyncIterable<StreamEvent>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of createSSEStream(events)) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        const errorEvent: StreamEvent = {
          type: 'error',
          code: 'STREAM_ERROR',
          message: error instanceof Error ? error.message : 'Unknown streaming error',
        };
        controller.enqueue(encoder.encode(formatSSEEvent(errorEvent)));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
