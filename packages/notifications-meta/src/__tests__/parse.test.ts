import { describe, expect, it } from 'vitest';

import { parseInboundMetaWebhook } from '../parse';

function makePayload(overrides?: {
  messages?: unknown[];
  object?: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    object: overrides?.object ?? 'whatsapp_business_account',
    entry: [
      {
        changes: [
          {
            value: {
              messages: overrides?.messages ?? [
                {
                  from: '5511999999999',
                  id: 'wamid.abc123',
                  timestamp: '1700000000',
                  type: 'text',
                  text: { body: 'Hello there' },
                },
              ],
              metadata: overrides?.metadata ?? {
                phone_number_id: 'phone-123',
              },
            },
          },
        ],
      },
    ],
  };
}

describe('parseInboundMetaWebhook', () => {
  it('parses a canonical text message payload correctly', () => {
    const payload = makePayload();
    const result = parseInboundMetaWebhook(payload);

    expect(result.from).toBe('5511999999999');
    expect(result.externalMessageId).toBe('wamid.abc123');
    expect(result.content.type).toBe('text');
    expect(result.content.text).toBe('Hello there');
    expect(result.timestamp).toEqual(new Date(1700000000 * 1000));
    expect(result.metadata).toEqual({ phoneNumberId: 'phone-123' });
  });

  it('throws when the payload is not an object', () => {
    expect(() => parseInboundMetaWebhook('not-an-object')).toThrow(
      'expected an object',
    );
    expect(() => parseInboundMetaWebhook(null)).toThrow('expected an object');
  });

  it('throws when the object type is wrong', () => {
    expect(() => parseInboundMetaWebhook({ object: 'instagram' })).toThrow(
      'unexpected object type',
    );
  });

  it('throws when entry array is missing', () => {
    expect(() =>
      parseInboundMetaWebhook({ object: 'whatsapp_business_account' }),
    ).toThrow('missing entry array');
  });

  it('throws when messages array is missing', () => {
    const payload = makePayload({ messages: [] });
    // Empty messages array should throw
    expect(() => parseInboundMetaWebhook(payload)).toThrow(
      'missing messages array',
    );
  });

  it('throws when changes array is missing', () => {
    expect(() =>
      parseInboundMetaWebhook({
        object: 'whatsapp_business_account',
        entry: [{ changes: [] }],
      }),
    ).toThrow('missing changes array');
  });
});
