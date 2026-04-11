import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlaygroundCommands, type PlaygroundRuntimeConfig } from '../hooks/usePlaygroundCommands';

const defaultConfig: PlaygroundRuntimeConfig = {
  model: 'fast',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '',
  enableTools: true,
  enableMemory: false,
};

const serverCommands = [
  { slug: 'search', name: 'Search', description: 'KB search', category: 'knowledge' },
  { slug: 'feedback', name: 'Feedback', description: 'Send feedback', category: 'general' },
];

function mockFetchOk(data: unknown) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => data,
  } as unknown as Response);
}

function mockFetchError() {
  global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
}

function makeHarness(overrides: Partial<Parameters<typeof usePlaygroundCommands>[0]> = {}) {
  const onConfigChange = vi.fn();
  const onAppendSystemMessage = vi.fn();
  const onClearMessages = vi.fn();
  const exportMessages = vi.fn().mockReturnValue([]);
  const props = {
    mode: 'agent' as const,
    runtimeConfig: { ...defaultConfig },
    targetName: 'my-agent',
    onConfigChange,
    onAppendSystemMessage,
    onClearMessages,
    exportMessages,
    ...overrides,
  };
  return { props, onConfigChange, onAppendSystemMessage, onClearMessages, exportMessages };
}

describe('usePlaygroundCommands', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches commands from /api/chat-commands on mount', async () => {
    mockFetchOk(serverCommands);
    const { props } = makeHarness();
    const { result } = renderHook(() => usePlaygroundCommands(props));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/chat-commands'));
    expect(result.current.commands).toHaveLength(2);
    expect(result.current.commands[0].slug).toBe('search');
  });

  it('reports empty commands + error on network failure', async () => {
    mockFetchError();
    const { props } = makeHarness();
    const { result } = renderHook(() => usePlaygroundCommands(props));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.commands).toEqual([]);
    expect(result.current.error).not.toBeNull();
  });

  describe('executeLocal', () => {
    it('/clear calls onClearMessages and returns true', async () => {
      mockFetchOk([]);
      const { props, onClearMessages, onAppendSystemMessage } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let handled = false;
      act(() => { handled = result.current.executeLocal('clear', ''); });
      expect(handled).toBe(true);
      expect(onClearMessages).toHaveBeenCalledTimes(1);
      expect(onAppendSystemMessage).toHaveBeenCalledWith(expect.stringContaining('Chat cleared'));
    });

    it('/help emits a system message listing command slugs', async () => {
      mockFetchOk(serverCommands);
      const { props, onAppendSystemMessage } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.commands.length).toBeGreaterThan(0));

      act(() => { result.current.executeLocal('help', ''); });
      const text = onAppendSystemMessage.mock.calls[0][0] as string;
      expect(text).toContain('Available commands');
      expect(text).toContain('/search');
      expect(text).toContain('/feedback');
    });

    it('/status emits mode, target, model, temperature', async () => {
      mockFetchOk([]);
      const { props, onAppendSystemMessage } = makeHarness({ mode: 'workflow', targetName: 'wf-1' });
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.executeLocal('status', ''); });
      const text = onAppendSystemMessage.mock.calls[0][0] as string;
      expect(text).toContain('workflow');
      expect(text).toContain('wf-1');
      expect(text).toContain('fast');
      expect(text).toContain('0.7');
    });

    it('/model <valid> calls onConfigChange', async () => {
      mockFetchOk([]);
      const { props, onConfigChange } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.executeLocal('model', 'smart'); });
      expect(onConfigChange).toHaveBeenCalledWith({ model: 'smart' });
    });

    it('/model <invalid> does NOT change config', async () => {
      mockFetchOk([]);
      const { props, onConfigChange, onAppendSystemMessage } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.executeLocal('model', 'banana'); });
      expect(onConfigChange).not.toHaveBeenCalled();
      expect(onAppendSystemMessage).toHaveBeenCalledWith(expect.stringContaining('Invalid model'));
    });

    it('/temperature <0-2> calls onConfigChange', async () => {
      mockFetchOk([]);
      const { props, onConfigChange } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.executeLocal('temperature', '0.5'); });
      expect(onConfigChange).toHaveBeenCalledWith({ temperature: 0.5 });
    });

    it('/temperature <out-of-range> does NOT change config', async () => {
      mockFetchOk([]);
      const { props, onConfigChange, onAppendSystemMessage } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => { result.current.executeLocal('temperature', '9'); });
      expect(onConfigChange).not.toHaveBeenCalled();
      expect(onAppendSystemMessage).toHaveBeenCalledWith(expect.stringContaining('Temperature must be'));
    });

    it('unknown command returns false', async () => {
      mockFetchOk([]);
      const { props } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let handled = true;
      act(() => { handled = result.current.executeLocal('doesnotexist', ''); });
      expect(handled).toBe(false);
    });
  });

  describe('isBlocked', () => {
    it('blocks `agent` in workflow mode, not in agent mode', async () => {
      mockFetchOk([]);
      const { props: agentProps } = makeHarness({ mode: 'agent' });
      const { result: agentResult } = renderHook(() => usePlaygroundCommands(agentProps));
      await waitFor(() => expect(agentResult.current.isLoading).toBe(false));
      expect(agentResult.current.isBlocked('agent')).toBe(false);

      const { props: wfProps } = makeHarness({ mode: 'workflow' });
      const { result: wfResult } = renderHook(() => usePlaygroundCommands(wfProps));
      await waitFor(() => expect(wfResult.current.isLoading).toBe(false));
      expect(wfResult.current.isBlocked('agent')).toBe(true);
    });

    it('never blocks /clear', async () => {
      mockFetchOk([]);
      const { props } = makeHarness({ mode: 'workflow' });
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isBlocked('clear')).toBe(false);
    });
  });

  describe('parseCommand', () => {
    it('parses /help', async () => {
      mockFetchOk([]);
      const { props } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.parseCommand('/help')).toEqual({ slug: 'help', args: '' });
    });

    it('parses /model smart', async () => {
      mockFetchOk([]);
      const { props } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.parseCommand('/model smart')).toEqual({ slug: 'model', args: 'smart' });
    });

    it('returns null for non-command text', async () => {
      mockFetchOk([]);
      const { props } = makeHarness();
      const { result } = renderHook(() => usePlaygroundCommands(props));
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.parseCommand('hello world')).toBeNull();
    });
  });
});
