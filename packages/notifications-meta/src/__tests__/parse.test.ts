import { describe, it, expect } from 'vitest';
import { parseInboundMetaWebhook } from '../parse';

const CANONICAL_TEXT_PAYLOAD = {
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              {
                from: '15551234567',
                id: 'wamid.HBgMNTU1MTIzNDU2Nzg',
                timestamp: '1700000000',
                type: 'text',
                text: { body: 'Hello from WhatsApp' },
              },
            ],
          },
        },
      ],
    },
  ],
};

const IMAGE_PAYLOAD = {
  entry: [
    {
      changes: [
        {
          value: {
            messages: [
              {
                from: '15559876543',
                id: 'wamid.IMG123',
                timestamp: '1700000001',
                type: 'image',
                image: {
                  id: 'media-id-123',
                  mime_type: 'image/jpeg',
                  caption: 'My photo',
                },
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('parseInboundMetaWebhook', () => {
  it('parses a canonical text message', () => {
    const result = parseInboundMetaWebhook(CANONICAL_TEXT_PAYLOAD);
    expect(result.from).toBe('15551234567');
    expect(result.externalMessageId).toBe('wamid.HBgMNTU1MTIzNDU2Nzg');
    expect(result.content.type).toBe('text');
    expect(result.content.text).toBe('Hello from WhatsApp');
    expect(result.timestamp).toEqual(new Date(1700000000 * 1000));
  });

  it('parses an image message with caption', () => {
    const result = parseInboundMetaWebhook(IMAGE_PAYLOAD);
    expect(result.from).toBe('15559876543');
    expect(result.content.type).toBe('image');
    expect(result.content.mediaUrl).toBe('media-id-123');
    expect(result.content.text).toBe('My photo');
  });

  it('handles unsupported message types gracefully', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '15551111111',
                    id: 'wamid.UNK',
                    timestamp: '1700000002',
                    type: 'sticker',
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const result = parseInboundMetaWebhook(payload);
    expect(result.content.type).toBe('text');
    expect(result.content.text).toContain('unsupported');
  });

  it('throws on missing entry', () => {
    expect(() => parseInboundMetaWebhook({})).toThrow('missing entry');
  });

  it('throws on empty entry array', () => {
    expect(() => parseInboundMetaWebhook({ entry: [] })).toThrow('missing entry');
  });

  it('throws on missing changes', () => {
    expect(() => parseInboundMetaWebhook({ entry: [{}] })).toThrow('missing changes');
  });

  it('throws on missing messages', () => {
    expect(() =>
      parseInboundMetaWebhook({
        entry: [{ changes: [{ value: {} }] }],
      }),
    ).toThrow('missing messages');
  });

  it('includes metadata with rawType', () => {
    const result = parseInboundMetaWebhook(CANONICAL_TEXT_PAYLOAD);
    expect(result.metadata?.rawType).toBe('text');
  });
});
