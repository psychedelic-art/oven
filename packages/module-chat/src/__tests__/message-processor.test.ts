import { describe, it, expect, vi, beforeEach } from 'vitest';

let insertResult: unknown[] = [{ id: 1 }];
let selectResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResult)),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(selectResult)),
          })),
        })),
        orderBy: vi.fn(() => Promise.resolve(selectResult)),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(insertResult)),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([])),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

import { recordUserMessage, recordAssistantMessage } from '../engine/message-processor';
import { eventBus } from '@oven/module-registry';

describe('MessageProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertResult = [{ id: 1 }];
    selectResult = [];
  });

  describe('recordUserMessage()', () => {
    it('inserts a user message and returns its ID', async () => {
      insertResult = [{ id: 10 }];
      const id = await recordUserMessage({
        sessionId: 1,
        content: [{ type: 'text', text: 'Hello' }],
      });
      expect(id).toBe(10);
    });

    it('emits chat.message.sent event for user messages', async () => {
      insertResult = [{ id: 10 }];
      await recordUserMessage({
        sessionId: 1,
        content: [{ type: 'text', text: 'Hello' }],
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        'chat.message.sent',
        expect.objectContaining({ id: 10, sessionId: 1, role: 'user' })
      );
    });
  });

  describe('recordAssistantMessage()', () => {
    it('inserts an assistant message and returns its ID', async () => {
      insertResult = [{ id: 20 }];
      const id = await recordAssistantMessage({
        sessionId: 1,
        content: [{ type: 'text', text: 'I can help with that.' }],
        metadata: { tokensUsed: 150 },
      });
      expect(id).toBe(20);
    });

    it('emits chat.message.sent event for assistant messages', async () => {
      insertResult = [{ id: 20 }];
      await recordAssistantMessage({
        sessionId: 1,
        content: [{ type: 'text', text: 'Response' }],
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        'chat.message.sent',
        expect.objectContaining({ id: 20, sessionId: 1, role: 'assistant' })
      );
    });
  });
});
