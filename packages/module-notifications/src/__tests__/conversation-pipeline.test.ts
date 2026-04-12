import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn() },
}));

// Mock usage services so pipeline tests focus on conversation logic
vi.mock('../services/usage-metering', () => ({
  checkUsageLimit: vi.fn(),
  incrementUsage: vi.fn(),
  getMonthStart: () => '2026-04-01',
  getPeriodEnd: () => '2026-04-30',
}));

import { ingestInboundMessage } from '../services/conversation-pipeline';
import type { InboundMessage } from '../types';
import { NOTIFICATION_EVENTS } from '../events';

const INBOUND_MSG: InboundMessage = {
  from: '15551234567',
  externalMessageId: 'wamid.TEST',
  timestamp: new Date('2026-01-01T00:00:00Z'),
  content: { type: 'text', text: 'Hello' },
};

describe('ingestInboundMessage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: usage check passes, increment succeeds
    const { checkUsageLimit, incrementUsage } = await import('../services/usage-metering');
    vi.mocked(checkUsageLimit).mockResolvedValue({
      allowed: true,
      limit: 300,
      used: 10,
      remaining: 290,
      source: 'config',
      periodStart: '2026-04-01',
    });
    vi.mocked(incrementUsage).mockResolvedValue({
      oldCount: 10,
      newCount: 11,
      limit: 300,
      warningEmitted: false,
      limitExceededEmitted: false,
    });
  });

  it('creates a new conversation when none exists', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const mockDb = createMockPipelineDb({ existingConversation: null });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await ingestInboundMessage({
      tenantId: 42,
      channelId: 1,
      channelType: 'whatsapp',
      message: INBOUND_MSG,
    });

    expect(result.isNewConversation).toBe(true);
    expect(result.conversationId).toBe(100);
    expect(result.messageId).toBe(200);
    expect(result.limitExceeded).toBe(false);

    const { eventBus } = await import('@oven/module-registry');
    expect(eventBus.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.MESSAGE_RECEIVED,
      expect.objectContaining({
        conversationId: 100,
        tenantId: 42,
        channelType: 'whatsapp',
        from: '15551234567',
      }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      NOTIFICATION_EVENTS.CONVERSATION_CREATED,
      expect.objectContaining({
        id: 100,
        tenantId: 42,
        channelType: 'whatsapp',
        externalUserId: '15551234567',
      }),
    );
  });

  it('reuses existing conversation', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const mockDb = createMockPipelineDb({
      existingConversation: { id: 50, tenantId: 42 },
    });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    const result = await ingestInboundMessage({
      tenantId: 42,
      channelId: 1,
      channelType: 'whatsapp',
      message: INBOUND_MSG,
    });

    expect(result.isNewConversation).toBe(false);
    expect(result.conversationId).toBe(50);

    const { eventBus } = await import('@oven/module-registry');
    // Should emit message.received but NOT conversation.created
    const calls = vi.mocked(eventBus.emit).mock.calls;
    const eventNames = calls.map((c) => c[0]);
    expect(eventNames).toContain(NOTIFICATION_EVENTS.MESSAGE_RECEIVED);
    expect(eventNames).not.toContain(NOTIFICATION_EVENTS.CONVERSATION_CREATED);
  });

  it('calls incrementUsage after inserting message', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const { incrementUsage } = await import('../services/usage-metering');
    const mockDb = createMockPipelineDb({ existingConversation: null });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    await ingestInboundMessage({
      tenantId: 42,
      channelId: 1,
      channelType: 'whatsapp',
      message: INBOUND_MSG,
    });

    expect(incrementUsage).toHaveBeenCalledWith(42, 'whatsapp', 300);
  });

  it('short-circuits with limitExceeded when usage check fails', async () => {
    const { checkUsageLimit } = await import('../services/usage-metering');
    vi.mocked(checkUsageLimit).mockResolvedValue({
      allowed: false,
      limit: 300,
      used: 300,
      remaining: 0,
      source: 'config',
      periodStart: '2026-04-01',
    });

    const result = await ingestInboundMessage({
      tenantId: 42,
      channelId: 1,
      channelType: 'whatsapp',
      message: INBOUND_MSG,
    });

    expect(result.limitExceeded).toBe(true);
    expect(result.conversationId).toBe(0);
    expect(result.messageId).toBe(0);

    // Should NOT emit any events
    const { eventBus } = await import('@oven/module-registry');
    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});

// ─── Mock DB helper ─────────────────────────────────────────

function createMockPipelineDb(opts: {
  existingConversation: { id: number; tenantId: number } | null;
}) {
  let insertCallCount = 0;

  const db: Record<string, unknown> = {
    select: () => db,
    from: () => db,
    where: () => db,
    limit: () => {
      // Conversation lookup
      return Promise.resolve(
        opts.existingConversation ? [opts.existingConversation] : [],
      );
    },
    insert: () => {
      insertCallCount++;
      return db;
    },
    update: () => db,
    set: () => db,
    values: () => db,
    returning: () => {
      if (!opts.existingConversation && insertCallCount === 1) {
        return Promise.resolve([{ id: 100 }]); // new conversation
      }
      return Promise.resolve([{ id: 200 }]); // message
    },
  };

  return db;
}
