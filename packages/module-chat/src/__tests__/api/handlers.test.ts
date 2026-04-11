import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for API handler utility functions and command/message parsing.
 * Full HTTP integration tests require NextRequest mocking — these test
 * the engine functions that handlers delegate to.
 */

import { isCommand, parseCommandInput } from '../../engine/message-processor';
import { validateSessionAccess } from '../../engine/session-manager';
import { formatSSEEvent } from '../../engine/streaming-handler';
import type { StreamEvent } from '../../types';

describe('API Handler Utilities', () => {
  describe('isCommand()', () => {
    it('detects slash commands', () => {
      expect(isCommand('/help')).toBe(true);
      expect(isCommand('/search query')).toBe(true);
    });

    it('rejects non-commands', () => {
      expect(isCommand('hello')).toBe(false);
      expect(isCommand('/ space')).toBe(false);
      expect(isCommand('/')).toBe(false);
      expect(isCommand('')).toBe(false);
    });
  });

  describe('parseCommandInput()', () => {
    it('parses command with no args', () => {
      expect(parseCommandInput('/help')).toEqual({ command: 'help', args: '' });
    });

    it('parses command with args', () => {
      expect(parseCommandInput('/search my query')).toEqual({ command: 'search', args: 'my query' });
    });

    it('handles extra whitespace', () => {
      expect(parseCommandInput('/model  gpt-4')).toEqual({ command: 'model', args: 'gpt-4' });
    });
  });

  describe('validateSessionAccess()', () => {
    it('validates by userId', () => {
      const session = { userId: 10, sessionToken: null } as never;
      expect(validateSessionAccess(session, { userId: 10 })).toBe(true);
      expect(validateSessionAccess(session, { userId: 99 })).toBe(false);
    });

    it('validates by sessionToken', () => {
      const session = { userId: null, sessionToken: 'tok_abc' } as never;
      expect(validateSessionAccess(session, { sessionToken: 'tok_abc' })).toBe(true);
      expect(validateSessionAccess(session, { sessionToken: 'tok_wrong' })).toBe(false);
    });

    it('denies when no credentials match', () => {
      const session = { userId: 10, sessionToken: null } as never;
      expect(validateSessionAccess(session, {})).toBe(false);
    });
  });

  describe('formatSSEEvent()', () => {
    it('formats token events correctly', () => {
      const event: StreamEvent = { type: 'token', text: 'Hello' };
      const result = formatSSEEvent(event);
      expect(result).toBe('data: {"type":"token","text":"Hello"}\n\n');
    });

    it('formats error events correctly', () => {
      const event: StreamEvent = { type: 'error', code: 'RATE_LIMIT', message: 'Too many requests' };
      const result = formatSSEEvent(event);
      expect(result).toContain('"code":"RATE_LIMIT"');
    });

    it('formats done events with metadata', () => {
      const event: StreamEvent = { type: 'done', messageId: 42, metadata: { tokensUsed: 150 } };
      const result = formatSSEEvent(event);
      const parsed = JSON.parse(result.replace('data: ', '').trim());
      expect(parsed.messageId).toBe(42);
      expect(parsed.metadata.tokensUsed).toBe(150);
    });
  });
});
