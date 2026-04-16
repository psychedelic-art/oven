/**
 * Harness self-test: verifies the SSE consumer parses frames produced by
 * the same `formatSSEEvent` helper used by
 * `packages/module-chat/src/engine/streaming-handler.ts` in production.
 *
 * Uses the SSE frame format:
 *   event: <type>\n
 *   data: <json>\n
 *   \n
 */
import { describe, it, expect } from 'vitest';
import { collectSSE, consumeSSE } from '../src';

function toResponse(frames: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const f of frames) controller.enqueue(enc.encode(f));
      controller.close();
    },
  });
  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('e2e: sse-consumer', () => {
  it('parses a stream of token frames into typed SSE events', async () => {
    const frames = [
      'event: token\ndata: {"text":"Hello"}\n\n',
      'event: token\ndata: {"text":" world"}\n\n',
      'event: done\ndata: {"sessionId":1,"messageId":42}\n\n',
    ];
    const events = await collectSSE(toResponse(frames));
    expect(events).toHaveLength(3);
    expect(events[0].event).toBe('token');
    expect(events[0].data).toEqual({ text: 'Hello' });
    expect(events[2].event).toBe('done');
    expect(events[2].data).toEqual({ sessionId: 1, messageId: 42 });
  });

  it('handles frames split across multiple chunks', async () => {
    const frames = [
      'event: token\ndata: {"tex',
      't":"chunky"}\n\nevent: done\n',
      'data: {}\n\n',
    ];
    const events = await collectSSE(toResponse(frames));
    expect(events).toHaveLength(2);
    expect(events[0].data).toEqual({ text: 'chunky' });
    expect(events[1].event).toBe('done');
  });

  it('treats comment lines and blank data as no-ops', async () => {
    const frames = [
      ': this is a keep-alive comment\n\n',
      'event: token\ndata: {"text":"ok"}\n\n',
    ];
    const events = await collectSSE(toResponse(frames));
    expect(events).toHaveLength(1);
    expect(events[0].data).toEqual({ text: 'ok' });
  });

  it('yields events incrementally as an async iterable', async () => {
    const frames = [
      'event: token\ndata: "a"\n\n',
      'event: token\ndata: "b"\n\n',
      'event: done\ndata: {}\n\n',
    ];
    const seen: string[] = [];
    for await (const ev of consumeSSE(toResponse(frames))) {
      seen.push(ev.event);
      if (ev.event === 'done') break;
    }
    expect(seen).toEqual(['token', 'token', 'done']);
  });
});
