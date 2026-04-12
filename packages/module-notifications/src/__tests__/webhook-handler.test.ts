import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';

// Mock dependencies before imports
vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn() },
}));

// Mock usage services so webhook tests focus on signature/routing logic
vi.mock('../services/usage-metering', () => ({
  checkUsageLimit: vi.fn().mockResolvedValue({
    allowed: true,
    limit: 300,
    used: 10,
    remaining: 290,
    source: 'config',
    periodStart: '2026-04-01',
  }),
  incrementUsage: vi.fn().mockResolvedValue({
    oldCount: 10,
    newCount: 11,
    limit: 300,
    warningEmitted: false,
    limitExceededEmitted: false,
  }),
  getMonthStart: () => '2026-04-01',
  getPeriodEnd: () => '2026-04-30',
}));

import { GET, POST } from '../api/notifications-whatsapp-webhook.handler';
import { registerNotificationAdapter, clearAdapters } from '../adapters/registry';

function makeRequest(url: string, options?: RequestInit) {
  return {
    nextUrl: new URL(url, 'http://localhost'),
    headers: new Headers(options?.headers),
    text: async () => options?.body as string ?? '',
    json: async () => JSON.parse(options?.body as string ?? '{}'),
  } as unknown as import('next/server').NextRequest;
}

function makeSignature(body: string, secret: string): string {
  const hex = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  return `sha256=${hex}`;
}

const APP_SECRET = 'test-secret-123';
const PHONE_NUMBER_ID = '123456';

const CHANNEL_ROW = {
  id: 1,
  tenantId: 42,
  channelType: 'whatsapp',
  adapterName: 'meta-whatsapp',
  name: 'Test Channel',
  config: { phoneNumberId: PHONE_NUMBER_ID, appSecret: APP_SECRET, accessToken: 'tok' },
  webhookVerifyToken: 'my-verify-token',
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const VALID_PAYLOAD = {
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { phone_number_id: PHONE_NUMBER_ID },
            messages: [
              {
                from: '15551234567',
                id: 'wamid.TEST',
                timestamp: '1700000000',
                type: 'text',
                text: { body: 'Hello' },
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('GET /notifications/whatsapp/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when hub.mode is not subscribe', async () => {
    const req = makeRequest('http://localhost/api/notifications/whatsapp/webhook?hub.mode=invalid&hub.verify_token=tok&hub.challenge=abc');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when verify_token is missing', async () => {
    const req = makeRequest('http://localhost/api/notifications/whatsapp/webhook?hub.mode=subscribe&hub.challenge=abc');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when channel with matching token is not found', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const mockDb = createMockDb([]);
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const req = makeRequest('http://localhost/api/notifications/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=abc');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns the challenge when token matches', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const mockDb = createMockDb([CHANNEL_ROW]);
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const req = makeRequest('http://localhost/api/notifications/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my-verify-token&hub.challenge=test-challenge-123');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe('test-challenge-123');
  });
});

describe('POST /notifications/whatsapp/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAdapters();
    // Register the real meta adapter's signature verifier
    registerNotificationAdapter({
      name: 'meta-whatsapp',
      channelType: 'whatsapp',
      async sendMessage() {
        return { externalMessageId: '', status: 'sent' };
      },
      async parseInboundWebhook(payload) {
        const obj = payload as Record<string, unknown>;
        const entry = (obj.entry as Array<Record<string, unknown>>)[0];
        const changes = (entry.changes as Array<Record<string, unknown>>)[0];
        const value = changes.value as Record<string, unknown>;
        const messages = (value.messages as Array<Record<string, unknown>>)[0];
        return {
          from: messages.from as string,
          externalMessageId: messages.id as string,
          timestamp: new Date(Number(messages.timestamp as string) * 1000),
          content: { type: 'text', text: (messages.text as Record<string, unknown>)?.body as string },
        };
      },
      async verifyWebhookSignature({ rawBody, signatureHeader, appSecret }) {
        // Inline HMAC verification (same logic as notifications-meta)
        if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
        const receivedHex = signatureHeader.slice('sha256='.length);
        const expectedHex = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');
        return receivedHex === expectedHex;
      },
    });
  });

  it('returns 401 when signature is invalid', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const body = JSON.stringify(VALID_PAYLOAD);
    const mockDb = createMockDbForPost([CHANNEL_ROW]);
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const req = makeRequest('http://localhost/api/notifications/whatsapp/webhook', {
      body,
      headers: { 'x-hub-signature-256': 'sha256=invalid' },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    // Should NOT emit any events
    const { eventBus } = await import('@oven/module-registry');
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it('returns 200 and ingests on valid signature', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const body = JSON.stringify(VALID_PAYLOAD);
    const sig = makeSignature(body, APP_SECRET);

    const mockDb = createMockDbForPost([CHANNEL_ROW]);
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const req = makeRequest('http://localhost/api/notifications/whatsapp/webhook', {
      body,
      headers: { 'x-hub-signature-256': sig },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const { eventBus } = await import('@oven/module-registry');
    expect(eventBus.emit).toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const req = makeRequest('http://localhost/api/notifications/whatsapp/webhook', {
      body: 'not json',
      headers: {},
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── Mock DB helpers ────────────────────────────────────────

function createMockDb(channelResults: unknown[]) {
  const chain: Record<string, unknown> = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(channelResults),
    // Make chain thenable so `await db.select().from().where()` works
    then: (resolve: (v: unknown[]) => void) => resolve(channelResults),
  };
  return chain;
}

function createMockDbForPost(channelResults: unknown[]) {
  let selectCallCount = 0;
  let currentSelectResult: unknown[] = channelResults;

  const chain: Record<string, unknown> = {
    select: () => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // allChannels query (webhook handler, no .limit())
        currentSelectResult = channelResults;
      } else if (selectCallCount === 2) {
        // conversation lookup (pipeline)
        currentSelectResult = [];
      } else {
        // usage lookup (pipeline)
        currentSelectResult = [];
      }
      return chain;
    },
    insert: () => chain,
    update: () => chain,
    set: () => chain,
    from: () => chain,
    where: () => chain,
    and: () => chain,
    values: () => chain,
    returning: () => Promise.resolve([{ id: 1 }]),
    limit: () => Promise.resolve(currentSelectResult),
    orderBy: () => chain,
    // Make chain thenable for queries without .limit()
    then: (resolve: (v: unknown[]) => void) => resolve(currentSelectResult),
  };
  return chain;
}
