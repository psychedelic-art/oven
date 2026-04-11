import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration test: verifies the full message processing pipeline
 * processMessage → hooks → command routing OR (context → prompt → agent) → hooks
 */

let selectResult: unknown[] = [];
let insertResult: unknown[] = [{ id: 1 }];

vi.mock('@oven/module-registry/db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(selectResult)),
          limit: vi.fn(() => Promise.resolve(selectResult)),
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

import { processMessage } from '../engine/message-processor';
import { eventBus } from '@oven/module-registry';

describe('Integration: Full Message Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    insertResult = [{ id: 1 }];
  });

  it('routes /help command through command registry', async () => {
    // resolveCommand will find the help command
    selectResult = [{ id: 1, slug: 'help', handler: 'builtin:help', isBuiltIn: true, enabled: true, name: 'Help', description: 'Show help', category: 'general', args: null, tenantId: null }];
    const result = await processMessage({ sessionId: 1, text: '/help' });
    expect(result.type).toBe('command');
    if (result.type === 'command') {
      expect(result.result.success).toBe(true);
      expect(result.result.output).toContain('commands');
    }
    expect(eventBus.emit).toHaveBeenCalledWith('chat.command.executed', expect.objectContaining({ command: 'help', success: true }));
  });

  it('records regular message when not a command', async () => {
    // No hooks, no commands matching
    selectResult = [];
    insertResult = [{ id: 42 }];
    const result = await processMessage({ sessionId: 1, text: 'Hello, can you help me?' });
    expect(result.type).toBe('message');
    if (result.type === 'message') {
      expect(result.messageId).toBe(42);
    }
    expect(eventBus.emit).toHaveBeenCalledWith('chat.message.sent', expect.objectContaining({ id: 42, role: 'user' }));
  });

  it('blocks message when pre-hook returns continue=false', async () => {
    // First DB call (loadHooks) returns a blocking hook
    selectResult = [
      {
        id: 1, name: 'Blocker', event: 'pre-message',
        handler: { type: 'condition', config: { action: 'block', reason: 'Content policy violation' } },
        priority: 10, enabled: true, tenantId: null, createdAt: new Date(), updatedAt: new Date(),
      },
    ];
    const result = await processMessage({ sessionId: 1, text: 'bad content' });
    expect(result.type).toBe('command'); // Blocked results come back as command type
    if (result.type === 'command') {
      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain('Content policy violation');
    }
  });

  it('treats unknown command as regular message', async () => {
    // resolveCommand returns nothing for unknown slugs
    selectResult = [];
    insertResult = [{ id: 10 }];
    const result = await processMessage({ sessionId: 1, text: '/unknowncmd' });
    // Unknown commands fall through to regular message recording
    expect(result.type).toBe('message');
  });

  it('emits events throughout the pipeline', async () => {
    selectResult = [];
    insertResult = [{ id: 5 }];
    await processMessage({ sessionId: 1, text: 'Hello' });
    // Should have emitted chat.message.sent
    expect(eventBus.emit).toHaveBeenCalledWith('chat.message.sent', expect.objectContaining({ role: 'user' }));
  });
});
