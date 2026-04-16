/**
 * End-to-end: tool permission gating via `executeTool` +
 * `ToolPermissionError`. No database required — this exercises the real
 * `@oven/module-agent-core/engine/tool-wrapper` surface with a mocked
 * `fetch()` so we can assert the permission check short-circuits before
 * any network call is made.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeTool,
  ToolPermissionError,
} from '@oven/module-agent-core/engine/tool-wrapper.ts';
import type { ToolSpec } from '@oven/module-agent-core/engine/tool-wrapper.ts';

const tool: ToolSpec = {
  name: 'kb.searchEntries',
  description: 'Search the knowledge base',
  parameters: {},
  method: 'POST',
  route: 'knowledge-base/[tenantSlug]/search',
  moduleSlug: 'knowledge-base',
  requiredPermissions: ['kb-entries.read'],
};

describe('e2e: tool permission gating', () => {
  const realFetch = globalThis.fetch;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('throws ToolPermissionError before making a network call when a required permission is missing', async () => {
    await expect(
      executeTool(tool, { tenantSlug: 'demo' }, 'http://localhost', {
        permissions: new Set<string>(), // empty — caller holds nothing
      }),
    ).rejects.toBeInstanceOf(ToolPermissionError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports missing permissions on the error instance', async () => {
    try {
      await executeTool(tool, { tenantSlug: 'demo' }, 'http://localhost', {
        permissions: new Set(['kb-entries.create']), // has write, lacks read
      });
      throw new Error('expected ToolPermissionError');
    } catch (err) {
      expect(err).toBeInstanceOf(ToolPermissionError);
      const perm = err as ToolPermissionError;
      expect(perm.toolName).toBe('kb.searchEntries');
      expect(perm.missing).toEqual(['kb-entries.read']);
    }
  });

  it('executes the fetch when the caller holds the required permission', async () => {
    const result = await executeTool(tool, { tenantSlug: 'demo' }, 'http://localhost', {
      permissions: new Set(['kb-entries.read']),
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost/api/knowledge-base/demo/search');
    expect(init.method).toBe('POST');
    expect(result).toEqual({ ok: true });
  });

  it('skips the permission check when the caller context has no permissions set', async () => {
    // This is the "host hasn't integrated auth yet" path: no context at all.
    await executeTool(tool, { tenantSlug: 'demo' }, 'http://localhost');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
