import type { NotificationAdapter } from '@oven/module-notifications/adapters';
import { verifyMetaSignature } from './signature';
import { parseInboundMetaWebhook } from './parse';
import { sendMetaMessage } from './send';

/**
 * Meta WhatsApp Business adapter for @oven/module-notifications.
 *
 * Register at app startup:
 *   import { registerNotificationAdapter } from '@oven/module-notifications';
 *   import { metaAdapter } from '@oven/notifications-meta';
 *   registerNotificationAdapter(metaAdapter);
 */
export const metaAdapter: NotificationAdapter = {
  name: 'meta-whatsapp',
  channelType: 'whatsapp',

  async sendMessage(channel, to, content) {
    return sendMetaMessage(channel, to, content);
  },

  async parseInboundWebhook(payload) {
    return parseInboundMetaWebhook(payload);
  },

  async verifyWebhookSignature({ rawBody, signatureHeader, appSecret }) {
    return verifyMetaSignature(rawBody, signatureHeader, appSecret);
  },
};

export { verifyMetaSignature } from './signature';
export { parseInboundMetaWebhook } from './parse';
export { sendMetaMessage } from './send';
