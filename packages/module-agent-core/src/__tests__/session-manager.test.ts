import { describe, it, expect, vi, beforeEach } from 'vitest';

let insertResult: unknown[] = [{ id: 1, agentId: 1, status: 'active' }];
let selectResult: unknown[] = [];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(selectResult)),
          orderBy: vi.fn(() => Promise.resolve(selectResult)),
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

import { getOrCreateSession, appendMessage, archiveSession } from '../engine/session-manager';
import { eventBus } from '@oven/module-registry';

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    insertResult = [{ id: 1, agentId: 1, status: 'active' }];
  });

  describe('getOrCreateSession()', () => {
    it('creates a new session when no sessionId provided', async () => {
      const result = await getOrCreateSession({ agentId: 1 });
      expect(result.id).toBe(1);
      expect(result.isNew).toBe(true);
    });

    it('emits agents.session.created event', async () => {
      await getOrCreateSession({ agentId: 1 });
      expect(eventBus.emit).toHaveBeenCalledWith('agents.session.created', expect.objectContaining({ agentId: 1 }));
    });

    it('returns existing session when sessionId matches', async () => {
      selectResult = [{ id: 42, agentId: 1, status: 'active' }];
      const result = await getOrCreateSession({ agentId: 1, sessionId: 42 });
      expect(result.id).toBe(42);
      expect(result.isNew).toBe(false);
    });
  });

  describe('appendMessage()', () => {
    it('inserts a message and returns its ID', async () => {
      insertResult = [{ id: 10 }];
      const id = await appendMessage({
        sessionId: 1,
        role: 'user',
        content: 'Hello',
      });
      expect(id).toBe(10);
    });

    it('emits agents.message.sent event', async () => {
      insertResult = [{ id: 10 }];
      await appendMessage({ sessionId: 1, role: 'user', content: 'Hi' });
      expect(eventBus.emit).toHaveBeenCalledWith('agents.message.sent', expect.objectContaining({
        sessionId: 1,
        role: 'user',
      }));
    });
  });

  describe('archiveSession()', () => {
    it('emits agents.session.archived event', async () => {
      selectResult = [{ id: 1, agentId: 5, userId: 3 }];
      await archiveSession(1);
      expect(eventBus.emit).toHaveBeenCalledWith('agents.session.archived', expect.objectContaining({
        id: 1,
        agentId: 5,
      }));
    });
  });
});
