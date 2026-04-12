import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn() },
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
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('increments usage counter', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const mockDb = createMockPipelineDb({
      existingConversation: null,
      existingUsage: { id: 10, messageCount: 5 },
    });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    await ingestInboundMessage({
      tenantId: 42,
      channelId: 1,
      channelType: 'whatsapp',
      message: INBOUND_MSG,
    });

    // Verify update was called (the mock records it)
    expect(mockDb._updateCalled).toBe(true);
  });

  it('creates usage row when none exists for period', async () => {
    const { getDb } = await import('@oven/module-registry/db');
    const mockDb = createMockPipelineDb({
      existingConversation: null,
      existingUsage: null,
    });
    vi.mocked(getDb).mockReturnValue(mockDb as ReturnType<typeof getDb>);

    await ingestInboundMessage({
      tenantId: 42,
      channelId: 1,
      channelType: 'whatsapp',
      message: INBOUND_MSG,
    });

    expect(mockDb._insertCount).toBeGreaterThanOrEqual(2); // conversation + message + usage
  });
});

// ─── Mock DB helper ─────────────────────────────────────────

function createMockPipelineDb(opts: {
  existingConversation: { id: number; tenantId: number } | null;
  existingUsage?: { id: number; messageCount: number } | null;
}) {
  let selectCallCount = 0;
  let insertCallCount = 0;

  const db: Record<string, unknown> & {
    _updateCalled: boolean;
    _insertCount: number;
  } = {
    _updateCalled: false,
    _insertCount: 0,
    select: () => db,
    from: () => db,
    where: () => db,
    limit: () => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Conversation lookup
        return Promise.resolve(
          opts.existingConversation ? [opts.existingConversation] : [],
        );
      }
      if (selectCallCount === 2) {
        // Usage lookup
        return Promise.resolve(
          opts.existingUsage ? [opts.existingUsage] : [],
        );
      }
      return Promise.resolve([]);
    },
    insert: () => {
      insertCallCount++;
      db._insertCount = insertCallCount;
      return db;
    },
    update: () => {
      db._updateCalled = true;
      return db;
    },
    set: () => db,
    values: () => db,
    returning: () => {
      // Return appropriate IDs based on insert order
      if (!opts.existingConversation && insertCallCount === 1) {
        return Promise.resolve([{ id: 100 }]); // new conversation
      }
      if (insertCallCount <= 2) {
        return Promise.resolve([{ id: 200 }]); // message
      }
      return Promise.resolve([{ id: 300 }]); // usage
    },
  };

  return db;
}
