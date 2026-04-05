import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mutable fixtures ───────────────────────────────────────

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
  resolveCommand,
  executeCommand,
  listCommands,
} from '../engine/command-registry';
import { eventBus } from '@oven/module-registry';

describe('CommandRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
  });

  describe('resolveCommand()', () => {
    it('resolves a command by slug from DB', async () => {
      selectResult = [{ id: 1, slug: 'help', handler: 'builtin:help', isBuiltIn: true, enabled: true }];
      const cmd = await resolveCommand('help');
      expect(cmd).not.toBeNull();
      expect(cmd!.slug).toBe('help');
    });

    it('returns null for unknown command', async () => {
      selectResult = [];
      const cmd = await resolveCommand('nonexistent');
      expect(cmd).toBeNull();
    });

    it('returns null for disabled command', async () => {
      selectResult = [{ id: 1, slug: 'test', handler: 'custom:test', enabled: false }];
      const cmd = await resolveCommand('test');
      expect(cmd).toBeNull();
    });

    it('resolves tenant-scoped command when tenantId provided', async () => {
      selectResult = [{ id: 5, slug: 'custom', handler: 'custom:handler', tenantId: 1, enabled: true }];
      const cmd = await resolveCommand('custom', 1);
      expect(cmd).not.toBeNull();
      expect(cmd!.id).toBe(5);
    });
  });

  describe('executeCommand()', () => {
    it('returns structured success result for known builtin', async () => {
      const result = await executeCommand(
        { id: 1, slug: 'help', handler: 'builtin:help', isBuiltIn: true, enabled: true, name: 'Help', description: 'Show help', category: 'general', args: null, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
        '',
        { sessionId: 1 }
      );
      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('returns error result for unknown handler prefix', async () => {
      const result = await executeCommand(
        { id: 99, slug: 'bad', handler: 'unknown:handler', isBuiltIn: false, enabled: true, name: 'Bad', description: '', category: '', args: null, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
        '',
        { sessionId: 1 }
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown handler');
    });

    it('emits chat.command.executed event on success', async () => {
      await executeCommand(
        { id: 1, slug: 'clear', handler: 'builtin:clear', isBuiltIn: true, enabled: true, name: 'Clear', description: '', category: '', args: null, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
        '',
        { sessionId: 42 }
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        'chat.command.executed',
        expect.objectContaining({ sessionId: 42, command: 'clear', success: true })
      );
    });

    it('emits event with success=false on failure', async () => {
      await executeCommand(
        { id: 99, slug: 'bad', handler: 'unknown:x', isBuiltIn: false, enabled: true, name: 'Bad', description: '', category: '', args: null, tenantId: null, createdAt: new Date(), updatedAt: new Date() },
        '',
        { sessionId: 1 }
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        'chat.command.executed',
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('listCommands()', () => {
    it('returns all enabled commands', async () => {
      selectResult = [
        { id: 1, slug: 'help', enabled: true },
        { id: 2, slug: 'clear', enabled: true },
      ];
      const cmds = await listCommands();
      expect(cmds).toHaveLength(2);
    });
  });
});
