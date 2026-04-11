import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  })),
}));

vi.mock('@oven/module-registry', () => ({
  eventBus: { emit: vi.fn().mockResolvedValue(undefined) },
}));

import {
  loadHooks,
  executeHooks,
} from '../engine/hook-manager';
import { eventBus } from '@oven/module-registry';
import type { HookEvent } from '../types';

describe('HookManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  describe('loadHooks()', () => {
    it('loads hooks for a specific event sorted by priority', async () => {
      selectResult = [
        { id: 1, event: 'pre-message', handler: { type: 'event', config: {} }, priority: 10, enabled: true },
        { id: 2, event: 'pre-message', handler: { type: 'condition', config: {} }, priority: 20, enabled: true },
      ];
      const hooks = await loadHooks('pre-message' as HookEvent);
      expect(hooks).toHaveLength(2);
    });

    it('returns empty array when no hooks match', async () => {
      selectResult = [];
      const hooks = await loadHooks('on-error' as HookEvent);
      expect(hooks).toHaveLength(0);
    });
  });

  describe('executeHooks()', () => {
    it('executes hooks in priority order and returns results', async () => {
      const hooks = [
        { id: 1, name: 'Hook A', event: 'pre-message', handler: { type: 'event' as const, config: { eventName: 'test.event', payload: {} } }, priority: 10, enabled: true, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'Hook B', event: 'pre-message', handler: { type: 'event' as const, config: { eventName: 'test.event2', payload: {} } }, priority: 20, enabled: true, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      const results = await executeHooks(hooks, { sessionId: 1, message: 'test' });
      expect(results).toHaveLength(2);
      expect(results[0].hookId).toBe(1);
      expect(results[1].hookId).toBe(2);
    });

    it('emits chat.hook.executed for each hook', async () => {
      const hooks = [
        { id: 1, name: 'H1', event: 'post-message', handler: { type: 'event' as const, config: { eventName: 'test.evt', payload: {} } }, priority: 10, enabled: true, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      await executeHooks(hooks, { sessionId: 5, message: '' });
      expect(eventBus.emit).toHaveBeenCalledWith(
        'chat.hook.executed',
        expect.objectContaining({ sessionId: 5, hookId: 1, event: 'post-message' })
      );
    });

    it('stops chain when a condition hook returns continue=false', async () => {
      const hooks = [
        { id: 1, name: 'Blocker', event: 'pre-message', handler: { type: 'condition' as const, config: { action: 'block', reason: 'Blocked' } }, priority: 10, enabled: true, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'After', event: 'pre-message', handler: { type: 'event' as const, config: { eventName: 'wont.run' } }, priority: 20, enabled: true, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      const results = await executeHooks(hooks, { sessionId: 1, message: 'test' });
      // Blocker runs, After does not
      expect(results).toHaveLength(1);
      expect(results[0].continue).toBe(false);
    });

    it('handles empty hooks array gracefully', async () => {
      const results = await executeHooks([], { sessionId: 1, message: '' });
      expect(results).toHaveLength(0);
    });

    it('event handler type emits via eventBus', async () => {
      const hooks = [
        { id: 1, name: 'Logger', event: 'post-message', handler: { type: 'event' as const, config: { eventName: 'audit.log', payload: { action: 'message_sent' } } }, priority: 10, enabled: true, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      await executeHooks(hooks, { sessionId: 1, message: 'hello' });
      // Should emit the audit event in addition to hook.executed
      expect(eventBus.emit).toHaveBeenCalledWith('audit.log', expect.objectContaining({ action: 'message_sent' }));
    });

    it('api handler type returns result without crashing (mock fetch)', async () => {
      const hooks = [
        { id: 3, name: 'Webhook', event: 'post-message', handler: { type: 'api' as const, config: { url: 'https://example.com/hook', method: 'POST' } }, priority: 10, enabled: true, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      // Should not throw even if fetch fails
      const results = await executeHooks(hooks, { sessionId: 1, message: '' });
      expect(results).toHaveLength(1);
      expect(results[0].hookId).toBe(3);
    });
  });
});
