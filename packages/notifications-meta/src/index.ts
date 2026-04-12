import type { NotificationAdapter } from '@oven/module-notifications/adapters';

import { parseInboundMetaWebhook } from './parse';
import { sendMetaMessage } from './send';
import { verifyMetaSignature } from './signature';

/**
 * Meta WhatsApp Business adapter for @oven/module-notifications.
 *
 * Register this adapter at app startup:
 * ```ts
 * import { registerNotificationAdapter } from '@oven/module-notifications';
 * import { metaAdapter } from '@oven/notifications-meta';
 * registerNotificationAdapter(metaAdapter);
 * ```
 */
export const metaAdapter: NotificationAdapter = {
  name: 'meta-whatsapp',
  channelType: 'whatsapp',

  sendMessage: sendMetaMessage,

  async parseInboundWebhook(payload: unknown) {
    return parseInboundMetaWebhook(payload);
  },

  async verifyWebhookSignature({ rawBody, signatureHeader, appSecret }) {
    return verifyMetaSignature(rawBody, signatureHeader, appSecret);
  },
};

export { parseInboundMetaWebhook } from './parse';
export { sendMetaMessage } from './send';
export { verifyMetaSignature } from './signature';
