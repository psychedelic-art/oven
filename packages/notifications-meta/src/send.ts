import type {
  ChannelConfig,
  MessageContent,
  SendResult,
} from '@oven/module-notifications/adapters';

/**
 * Send a WhatsApp message via the Meta Graph API.
 *
 * POST /{apiVersion}/{phoneNumberId}/messages
 *
 * The channel config must contain:
 * - phoneNumberId: string
 * - accessToken: string (already decrypted)
 * - apiVersion?: string (defaults to 'v21.0')
 */
export async function sendMetaMessage(
  channel: ChannelConfig,
  to: string,
  content: MessageContent,
): Promise<SendResult> {
  const phoneNumberId = channel.phoneNumberId as string;
  const accessToken = channel.accessToken as string;
  const apiVersion = (channel.apiVersion as string) || 'v21.0';

  const body = buildMessagePayload(to, content);

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      externalMessageId: '',
      status: 'failed',
      error: `Meta API ${response.status}: ${errorText}`,
    };
  }

  const result = (await response.json()) as Record<string, unknown>;
  const messages = result.messages as Array<Record<string, unknown>> | undefined;
  const messageId = messages?.[0]?.id as string || '';

  return {
    externalMessageId: messageId,
    status: 'sent',
  };
}

function buildMessagePayload(
  to: string,
  content: MessageContent,
): Record<string, unknown> {
  const base = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
  };

  switch (content.type) {
    case 'text':
      return { ...base, type: 'text', text: { body: content.text } };

    case 'template':
      return {
        ...base,
        type: 'template',
        template: {
          name: content.templateName,
          language: { code: 'en' },
          components: content.templateParams
            ? [
                {
                  type: 'body',
                  parameters: Object.values(content.templateParams).map(
                    (value) => ({ type: 'text', text: value }),
                  ),
                },
              ]
            : [],
        },
      };

    case 'image':
      return {
        ...base,
        type: 'image',
        image: { link: content.mediaUrl, caption: content.text },
      };

    case 'document':
      return {
        ...base,
        type: 'document',
        document: { link: content.mediaUrl, caption: content.text },
      };

    default:
      return { ...base, type: 'text', text: { body: content.text || '' } };
  }
}
