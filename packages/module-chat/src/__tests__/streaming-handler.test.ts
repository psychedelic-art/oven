import { describe, it, expect } from 'vitest';
import { formatSSEEvent, createSSEStream } from '../engine/streaming-handler';
import type { StreamEvent } from '../types';

describe('StreamingHandler', () => {
  describe('formatSSEEvent()', () => {
    it('formats a token event as SSE', () => {
      const event: StreamEvent = { type: 'token', text: 'Hello' };
      const result = formatSSEEvent(event);
      expect(result).toBe('data: {"type":"token","text":"Hello"}\n\n');
    });

    it('formats a toolCallStart event', () => {
      const event: StreamEvent = { type: 'toolCallStart', toolCallId: 'tc1', toolName: 'kb.search', input: { query: 'test' } };
      const result = formatSSEEvent(event);
      expect(result).toContain('"type":"toolCallStart"');
      expect(result).toContain('"toolName":"kb.search"');
    });

    it('formats a done event with messageId', () => {
      const event: StreamEvent = { type: 'done', messageId: 42, metadata: { tokensUsed: 150 } };
      const result = formatSSEEvent(event);
      expect(result).toContain('"messageId":42');
    });

    it('formats an error event', () => {
      const event: StreamEvent = { type: 'error', code: 'AGENT_ERROR', message: 'Agent failed' };
      const result = formatSSEEvent(event);
      expect(result).toContain('"code":"AGENT_ERROR"');
    });
  });

  describe('createSSEStream()', () => {
    it('transforms an async iterable of events into SSE string chunks', async () => {
      async function* mockStream(): AsyncGenerator<StreamEvent> {
        yield { type: 'token', text: 'Hi' };
        yield { type: 'token', text: ' there' };
        yield { type: 'done', messageId: 1 };
      }

      const chunks: string[] = [];
      for await (const chunk of createSSEStream(mockStream())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toContain('"text":"Hi"');
      expect(chunks[2]).toContain('"messageId":1');
    });
  });
});
