'use client';

// ─── OvenChatTransport ──────────────────────────────────────
// Custom ChatTransport for @ai-sdk/react's useChat that bridges
// OVEN's SSE streaming format to the AI SDK's internal message format.
//
// This transport:
// 1. POSTs to /api/chat-sessions/{id}/messages (our endpoint)
// 2. Parses our SSE format (token/done/error/toolCallStart/toolCallEnd)
// 3. Maps events to AI SDK's expected callback interface
//
// Reference: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
//
// Future: when backend adopts result.toDataStreamResponse() from the
// Vercel AI SDK, we can drop this transport and use the default.

import type { UIMessage } from '../types';

export interface OvenChatTransportOpts {
  apiBaseUrl: string;
  getSessionId: () => number | null;
  getHeaders: () => Record<string, string>;
}

export interface TransportSendOpts {
  messages: Array<{ role: string; content: string; id?: string }>;
  abortSignal?: AbortSignal;
  onUpdate: (messages: Array<{ role: string; content: string; id: string }>) => void;
  onFinish: (result: { messages: Array<{ role: string; content: string; id: string }> }) => void;
  onError: (error: Error) => void;
}

/**
 * Chat transport adapter that bridges OVEN's custom SSE format to the
 * @ai-sdk/react useChat hook. This allows using the AI SDK's state
 * management while keeping our backend streaming format stable.
 */
export class OvenChatTransport {
  private opts: OvenChatTransportOpts;

  constructor(opts: OvenChatTransportOpts) {
    this.opts = opts;
  }

  async sendMessages({ messages, abortSignal, onUpdate, onFinish, onError }: TransportSendOpts): Promise<void> {
    const sessionId = this.opts.getSessionId();
    if (!sessionId) {
      onError(new Error('No session ID available'));
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      onError(new Error('Last message must be a user message'));
      return;
    }

    try {
      const res = await fetch(
        `${this.opts.apiBaseUrl}/api/chat-sessions/${sessionId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.opts.getHeaders(),
          },
          body: JSON.stringify({ content: lastMessage.content }),
          signal: abortSignal,
        },
      );

      if (!res.ok) {
        throw new Error(`Send failed: ${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type') ?? '';

      if (contentType.includes('text/event-stream') && res.body) {
        // SSE streaming mode — parse our custom format
        await this.parseSSEStream(res.body, messages, { onUpdate, onFinish, onError });
      } else {
        // JSON response mode (non-streaming fallback)
        const data = await res.json();
        const assistantMessage = {
          role: 'assistant',
          content: data.text ?? data.content ?? '',
          id: String(data.id ?? `json_${Date.now()}`),
        };
        onFinish({ messages: [...messages, assistantMessage] });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private async parseSSEStream(
    body: ReadableStream<Uint8Array>,
    previousMessages: Array<{ role: string; content: string; id?: string }>,
    handlers: Pick<TransportSendOpts, 'onUpdate' | 'onFinish' | 'onError'>,
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    const assistantId = `stream_${Date.now()}`;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'token':
                accumulated += event.text;
                handlers.onUpdate([
                  ...previousMessages,
                  { role: 'assistant', content: accumulated, id: assistantId },
                ]);
                break;

              case 'done':
                handlers.onFinish({
                  messages: [
                    ...previousMessages,
                    {
                      role: 'assistant',
                      content: accumulated,
                      id: String(event.messageId ?? assistantId),
                    },
                  ],
                });
                return;

              case 'error':
                handlers.onError(new Error(event.message ?? 'Stream error'));
                return;
            }
          } catch {
            // Skip malformed SSE events
          }
        }
      }

      // Stream ended without a 'done' event — finalize with what we have
      if (accumulated) {
        handlers.onFinish({
          messages: [
            ...previousMessages,
            { role: 'assistant', content: accumulated, id: assistantId },
          ],
        });
      }
    } finally {
      reader.releaseLock();
    }
  }
}
