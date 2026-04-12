import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notificationChannels } from '../schema';
import { getAdapter } from '../adapters/registry';
import { ingestInboundMessage } from '../services/conversation-pipeline';

/**
 * GET /api/notifications/whatsapp/webhook
 *
 * Meta webhook verification. Returns hub.challenge when the verify
 * token matches the channel's webhookVerifyToken.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const db = getDb();
  const channels = await db
    .select()
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.adapterName, 'meta-whatsapp'),
        eq(notificationChannels.webhookVerifyToken, token),
        eq(notificationChannels.enabled, true),
      ),
    )
    .limit(1);

  if (channels.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * POST /api/notifications/whatsapp/webhook
 *
 * Meta webhook for inbound WhatsApp messages. Reads the raw body
 * BEFORE JSON parsing to verify the HMAC signature.
 */
export async function POST(request: NextRequest) {
  // 1. Read raw body before any JSON parsing
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-hub-signature-256');

  // 2. Parse the payload to identify the phone number ID
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 3. Extract phoneNumberId from the webhook payload
  const phoneNumberId = extractPhoneNumberId(payload);
  if (!phoneNumberId) {
    return NextResponse.json({ error: 'Missing phone number ID' }, { status: 400 });
  }

  // 4. Look up the channel by phoneNumberId
  const db = getDb();
  const channels = await db
    .select()
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.adapterName, 'meta-whatsapp'),
        eq(notificationChannels.enabled, true),
      ),
    );

  const channel = channels.find((ch) => {
    const config = ch.config as Record<string, unknown>;
    return config?.phoneNumberId === phoneNumberId;
  });

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  // 5. Resolve the adapter
  const adapter = getAdapter('meta-whatsapp');
  if (!adapter) {
    return NextResponse.json(
      { error: 'Adapter not registered' },
      { status: 500 },
    );
  }

  // 6. Verify webhook signature
  const channelConfig = channel.config as Record<string, unknown>;
  const appSecret = channelConfig.appSecret as string;
  if (!appSecret) {
    return NextResponse.json(
      { error: 'Channel missing appSecret' },
      { status: 500 },
    );
  }

  const signatureValid = await adapter.verifyWebhookSignature({
    rawBody,
    signatureHeader,
    appSecret,
  });

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 7. Parse the inbound message
  const message = await adapter.parseInboundWebhook(payload);

  // 8. Ingest into the conversation pipeline
  const result = await ingestInboundMessage({
    tenantId: channel.tenantId,
    channelId: channel.id,
    channelType: channel.channelType,
    message,
  });

  return NextResponse.json({
    conversationId: result.conversationId,
    messageId: result.messageId,
    isNewConversation: result.isNewConversation,
  });
}

/**
 * Extract the phone number ID from a Meta webhook payload.
 */
function extractPhoneNumberId(
  payload: Record<string, unknown>,
): string | null {
  try {
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const metadata = value?.metadata as Record<string, unknown>;
    return (metadata?.phone_number_id as string) ?? null;
  } catch {
    return null;
  }
}
