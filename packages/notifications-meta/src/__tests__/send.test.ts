import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChannelConfig, MessageContent } from '@oven/module-notifications/adapters';

import { sendMetaMessage } from '../send';

const CHANNEL: ChannelConfig = {
  accessToken: 'test-token',
  phoneNumberId: 'phone-123',
  apiVersion: 'v21.0',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('sendMetaMessage', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends a text message and returns the external message ID', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ messages: [{ id: 'wamid.sent123' }] }),
    );

    const content: MessageContent = { type: 'text', text: 'Hello!' };
    const result = await sendMetaMessage(CHANNEL, '+5511999999999', content);

    expect(result.externalMessageId).toBe('wamid.sent123');
    expect(result.status).toBe('sent');
    expect(result.error).toBeUndefined();

    // Verify the fetch was called correctly
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(url).toBe(
      'https://graph.facebook.com/v21.0/phone-123/messages',
    );
    expect(init?.method).toBe('POST');

    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({
      messaging_product: 'whatsapp',
      to: '+5511999999999',
      type: 'text',
      text: { body: 'Hello!' },
    });

    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('returns failed status when the API responds with an error', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse(
        { error: { message: 'Invalid access token', code: 190 } },
        401,
      ),
    );

    const content: MessageContent = { type: 'text', text: 'Hello!' };
    const result = await sendMetaMessage(CHANNEL, '+5511999999999', content);

    expect(result.status).toBe('failed');
    expect(result.error).toBe('Invalid access token');
    expect(result.externalMessageId).toBe('');
  });

  it('uses default apiVersion when not specified', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ messages: [{ id: 'wamid.default' }] }),
    );

    const channelWithoutVersion: ChannelConfig = {
      accessToken: 'test-token',
      phoneNumberId: 'phone-456',
    };

    const content: MessageContent = { type: 'text', text: 'Hi' };
    await sendMetaMessage(channelWithoutVersion, '+5511999999999', content);

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0]!;
    expect(url).toBe(
      'https://graph.facebook.com/v21.0/phone-456/messages',
    );
  });

  it('builds a template message request body correctly', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      jsonResponse({ messages: [{ id: 'wamid.tmpl1' }] }),
    );

    const content: MessageContent = {
      type: 'template',
      templateName: 'order_update',
      templateParams: { status: 'shipped', tracking: 'ABC123' },
    };

    const result = await sendMetaMessage(CHANNEL, '+5511999999999', content);
    expect(result.status).toBe('sent');

    const body = JSON.parse(
      vi.mocked(globalThis.fetch).mock.calls[0]![1]?.body as string,
    );
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('order_update');
  });

  it('handles non-JSON error responses gracefully', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const content: MessageContent = { type: 'text', text: 'Hello!' };
    const result = await sendMetaMessage(CHANNEL, '+5511999999999', content);

    expect(result.status).toBe('failed');
    expect(result.error).toContain('500');
  });
});
