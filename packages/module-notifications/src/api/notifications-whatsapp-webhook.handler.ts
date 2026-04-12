import { type NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notificationChannels } from '../schema';
import { getAdapter } from '../adapters/registry';
import { ingestInboundMessage } from '../services/conversation-pipeline';

/**
 * GET /api/notifications/whatsapp/webhook
 *
 * Meta subscription verification. Checks hub.mode=subscribe and
 * verifies hub.verify_token against the channel's webhookVerifyToken.
 * Returns hub.challenge on success, 403 otherwise.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) {
    return NextResponse.json({ error: 'Invalid verification request' }, { status: 403 });
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
    return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * POST /api/notifications/whatsapp/webhook
 *
 * Inbound WhatsApp message handler. Reads raw body FIRST for signature
 * verification (before any JSON parsing), then delegates to the
 * conversation pipeline.
 */
export async function POST(request: NextRequest) {
  // Read raw body BEFORE any JSON parsing (critical for HMAC verification)
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-hub-signature-256');

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Extract phone number ID from the webhook payload to identify the channel
  const obj = payload as Record<string, unknown>;
  const entry = obj?.entry as Array<Record<string, unknown>> | undefined;
  if (!entry || entry.length === 0) {
    return NextResponse.json({ error: 'Missing entry' }, { status: 400 });
  }

  const changes = entry[0]?.changes as Array<Record<string, unknown>> | undefined;
  if (!changes || changes.length === 0) {
    return NextResponse.json({ error: 'Missing changes' }, { status: 400 });
  }

  const value = changes[0]?.value as Record<string, unknown>;
  const metadata = value?.metadata as Record<string, unknown> | undefined;
  const phoneNumberId = metadata?.phone_number_id as string | undefined;

  if (!phoneNumberId) {
    return NextResponse.json({ error: 'Missing phone_number_id' }, { status: 400 });
  }

  // Look up the channel by phoneNumberId in config JSONB
  const db = getDb();
  const allChannels = await db
    .select()
    .from(notificationChannels)
    .where(
      and(
        eq(notificationChannels.adapterName, 'meta-whatsapp'),
        eq(notificationChannels.enabled, true),
      ),
    );

  const channel = allChannels.find((ch) => {
    const config = ch.config as Record<string, unknown>;
    return config?.phoneNumberId === phoneNumberId;
  });

  if (!channel) {
    return NextResponse.json({ error: 'Unknown phone number' }, { status: 404 });
  }

  // Verify signature
  const adapter = getAdapter('meta-whatsapp');
  if (!adapter) {
    return NextResponse.json({ error: 'Adapter not registered' }, { status: 500 });
  }

  const config = channel.config as Record<string, unknown>;
  const appSecret = config.appSecret as string;

  const signatureValid = await adapter.verifyWebhookSignature({
    rawBody,
    signatureHeader,
    appSecret,
  });

  if (!signatureValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Check for messages (some webhooks are status updates, not messages)
  const messages = value?.messages as Array<unknown> | undefined;
  if (!messages || messages.length === 0) {
    // Status update or non-message event — acknowledge
    return NextResponse.json({ status: 'ok' });
  }

  // Parse and ingest the inbound message
  const inbound = await adapter.parseInboundWebhook(payload);

  await ingestInboundMessage({
    tenantId: channel.tenantId,
    channelId: channel.id,
    channelType: 'whatsapp',
    message: inbound,
  });

  return NextResponse.json({ status: 'ok' });
}
