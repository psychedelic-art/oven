import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMetaMessage } from '../send';

const CHANNEL_CONFIG = {
  phoneNumberId: '123456789',
  accessToken: 'test-access-token',
  apiVersion: 'v21.0',
};

describe('sendMetaMessage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a text message and returns the external id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [{ id: 'wamid.SENT123' }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendMetaMessage(
      CHANNEL_CONFIG,
      '15551234567',
      { type: 'text', text: 'Hello' },
    );

    expect(result.status).toBe('sent');
    expect(result.externalMessageId).toBe('wamid.SENT123');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(
      'https://graph.facebook.com/v21.0/123456789/messages',
    );
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer test-access-token');

    const body = JSON.parse(options.body);
    expect(body.messaging_product).toBe('whatsapp');
    expect(body.to).toBe('15551234567');
    expect(body.type).toBe('text');
    expect(body.text.body).toBe('Hello');
  });

  it('sends a template message', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.TPL1' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendMetaMessage(
      CHANNEL_CONFIG,
      '15551234567',
      {
        type: 'template',
        templateName: 'welcome',
        templateParams: { name: 'Alice' },
      },
    );

    expect(result.status).toBe('sent');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('welcome');
  });

  it('returns failed status on API error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":{"message":"Invalid phone"}}',
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendMetaMessage(
      CHANNEL_CONFIG,
      'invalid',
      { type: 'text', text: 'Hello' },
    );

    expect(result.status).toBe('failed');
    expect(result.error).toContain('400');
    expect(result.externalMessageId).toBe('');
  });

  it('defaults apiVersion to v21.0', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.X' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await sendMetaMessage(
      { phoneNumberId: '999', accessToken: 'tok' },
      '15551234567',
      { type: 'text', text: 'Hi' },
    );

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('v21.0');
  });
});
