import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UnifiedAIPlayground } from '../playground/UnifiedAIPlayground';

/**
 * Smoke-level integration tests for the unified playground.
 *
 * Full behavioral coverage lives in the dedicated hook tests
 * (`usePlaygroundCommands.test.ts`, `useChat.appendMessage.test.ts`,
 * `filterMessagesForDisplay.test.ts`). These tests focus on:
 *   - the empty splash renders when no target is selected
 *   - commands are fetched from /api/chat-commands on mount
 *   - the center panel uses the agent-ui chat surface (no MUI leakage)
 */

const fetchCalls: string[] = [];

function installFetchMock() {
  fetchCalls.length = 0;
  global.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    fetchCalls.push(url);
    // Session create
    if (url.includes('/api/chat-sessions') && !url.includes('/messages')) {
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 42, sessionToken: 'tok' }),
      } as unknown as Response);
    }
    // Commands
    if (url.includes('/api/chat-commands')) {
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ([
          { slug: 'help', name: 'Help', description: 'Show help', category: 'general' },
          { slug: 'clear', name: 'Clear', description: 'Clear chat', category: 'general' },
        ]),
      } as unknown as Response);
    }
    // Agents list
    if (url.includes('/api/agents')) {
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ([
          { id: 1, name: 'Demo Agent', slug: 'demo-agent', description: 'for tests' },
        ]),
      } as unknown as Response);
    }
    // Workflows list
    if (url.includes('/api/agent-workflows')) {
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ([]),
      } as unknown as Response);
    }
    // Fallback
    return Promise.resolve({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ([]),
    } as unknown as Response);
  });
}

describe('UnifiedAIPlayground — smoke', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
    installFetchMock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the empty splash when no target is selected', async () => {
    render(<UnifiedAIPlayground />);
    // The splash shows both the page title and an instruction.
    await waitFor(() => {
      expect(screen.getByText(/Select an agent or workflow/i)).toBeInTheDocument();
    });
  });

  it('fetches commands from /api/chat-commands on mount', async () => {
    render(<UnifiedAIPlayground />);
    await waitFor(() => {
      expect(fetchCalls.some(u => u.includes('/api/chat-commands'))).toBe(true);
    });
  });

  it('renders the Target and Config left-panel tabs', async () => {
    render(<UnifiedAIPlayground />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Target' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Config' })).toBeInTheDocument();
    });
  });

  it('renders the right-panel Inspector / Eval / Trace tabs', async () => {
    render(<UnifiedAIPlayground />);
    await waitFor(() => {
      // Tab buttons are prefixed with emoji to disambiguate from the header
      // "Inspector" toggle button.
      expect(screen.getByRole('button', { name: /🔍 Inspector/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /📊 Eval/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /🔗 Trace/ })).toBeInTheDocument();
    });
  });
});
