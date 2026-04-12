import type {
  ChannelConfig,
  MessageContent,
  SendResult,
} from '@oven/module-notifications/adapters';

// ---------------------------------------------------------------------------
// Meta Graph API response types
// ---------------------------------------------------------------------------

interface MetaApiSuccess {
  messages: Array<{ id: string }>;
}

interface MetaApiError {
  error?: { message?: string; code?: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRequestBody(to: string, content: MessageContent): Record<string, unknown> {
  const base = {
    messaging_product: 'whatsapp',
    to,
  };

  switch (content.type) {
    case 'template':
      return {
        ...base,
        type: 'template',
        template: {
          name: content.templateName,
          language: { code: 'en' },
          ...(content.templateParams
            ? {
                components: [
                  {
                    type: 'body',
                    parameters: Object.values(content.templateParams).map((val) => ({
                      type: 'text',
                      text: val,
                    })),
                  },
                ],
              }
            : {}),
        },
      };

    case 'image':
      return {
        ...base,
        type: 'image',
        image: { link: content.mediaUrl },
      };

    case 'document':
      return {
        ...base,
        type: 'document',
        document: { link: content.mediaUrl },
      };

    case 'audio':
      return {
        ...base,
        type: 'audio',
        audio: { link: content.mediaUrl },
      };

    // text (default)
    default:
      return {
        ...base,
        type: 'text',
        text: { body: content.text ?? '' },
      };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a message via the Meta WhatsApp Business Graph API.
 *
 * Required `channel` config fields:
 * - `accessToken`    – Meta access token
 * - `phoneNumberId`  – WhatsApp Business phone number ID
 * - `apiVersion`     – Graph API version (defaults to `'v21.0'`)
 */
export async function sendMetaMessage(
  channel: ChannelConfig,
  to: string,
  content: MessageContent,
): Promise<SendResult> {
  const accessToken = channel.accessToken as string;
  const phoneNumberId = channel.phoneNumberId as string;
  const apiVersion = (channel.apiVersion as string | undefined) ?? 'v21.0';

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const body = buildRequestBody(to, content);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as MetaApiError;
    const errorMessage =
      errorData.error?.message ?? `Meta API responded with status ${response.status}`;

    return {
      externalMessageId: '',
      status: 'failed',
      error: errorMessage,
    };
  }

  const data = (await response.json()) as MetaApiSuccess;

  return {
    externalMessageId: data.messages?.[0]?.id ?? '',
    status: 'sent',
  };
}
