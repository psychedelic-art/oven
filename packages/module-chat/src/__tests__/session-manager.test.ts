import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mutable result fixtures ────────────────────────────────

let insertResult: unknown[] = [{ id: 1, tenantId: 1, agentId: 5, status: 'active', sessionToken: null, channel: 'web', isPinned: false }];
let selectResult: unknown[] = [];
let updateResult: unknown[] = [];

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
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve(updateResult)),
        })),
      })),
    })),
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

import { createSession, resumeSession, archiveSession, validateSessionAccess } from '../engine/session-manager';
import { eventBus } from '@oven/module-registry';

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    insertResult = [{ id: 1, tenantId: 1, agentId: 5, status: 'active', sessionToken: null, channel: 'web', isPinned: false }];
    updateResult = [];
  });

  describe('createSession()', () => {
    it('creates an authenticated session with userId', async () => {
      const session = await createSession({ tenantId: 1, agentId: 5, userId: 10, channel: 'web' });
      expect(session.id).toBe(1);
      expect(session.agentId).toBe(5);
    });

    it('creates an anonymous session with generated token', async () => {
      insertResult = [{ id: 2, tenantId: 1, agentId: 5, status: 'active', sessionToken: 'tok_abc123', channel: 'widget', isPinned: false }];
      const session = await createSession({ tenantId: 1, agentId: 5, channel: 'widget' });
      expect(session.id).toBe(2);
      expect(session.sessionToken).toBe('tok_abc123');
    });

    it('emits chat.session.created event', async () => {
      await createSession({ tenantId: 1, agentId: 5, userId: 10 });
      expect(eventBus.emit).toHaveBeenCalledWith(
        'chat.session.created',
        expect.objectContaining({ id: 1, agentId: 5 })
      );
    });
  });

  describe('resumeSession()', () => {
    it('returns existing active session by id', async () => {
      selectResult = [{ id: 42, tenantId: 1, agentId: 5, status: 'active', userId: 10 }];
      const session = await resumeSession(42);
      expect(session).not.toBeNull();
      expect(session!.id).toBe(42);
    });

    it('returns null for archived session', async () => {
      selectResult = [{ id: 42, tenantId: 1, agentId: 5, status: 'archived', userId: 10 }];
      const session = await resumeSession(42);
      expect(session).toBeNull();
    });

    it('returns null when session not found', async () => {
      selectResult = [];
      const session = await resumeSession(999);
      expect(session).toBeNull();
    });
  });

  describe('archiveSession()', () => {
    it('sets status to archived', async () => {
      updateResult = [{ id: 42, status: 'archived' }];
      const result = await archiveSession(42);
      expect(result).not.toBeNull();
    });

    it('emits chat.session.archived event', async () => {
      updateResult = [{ id: 42, status: 'archived' }];
      await archiveSession(42);
      expect(eventBus.emit).toHaveBeenCalledWith(
        'chat.session.archived',
        expect.objectContaining({ id: 42 })
      );
    });
  });

  describe('validateSessionAccess()', () => {
    it('grants access for authenticated user by userId', () => {
      const session = { id: 1, userId: 10, sessionToken: null } as never;
      expect(validateSessionAccess(session, { userId: 10 })).toBe(true);
    });

    it('grants access for anonymous user by sessionToken', () => {
      const session = { id: 1, userId: null, sessionToken: 'tok_abc' } as never;
      expect(validateSessionAccess(session, { sessionToken: 'tok_abc' })).toBe(true);
    });

    it('denies access for wrong userId', () => {
      const session = { id: 1, userId: 10, sessionToken: null } as never;
      expect(validateSessionAccess(session, { userId: 99 })).toBe(false);
    });

    it('denies access for wrong sessionToken', () => {
      const session = { id: 1, userId: null, sessionToken: 'tok_abc' } as never;
      expect(validateSessionAccess(session, { sessionToken: 'tok_wrong' })).toBe(false);
    });
  });
});
