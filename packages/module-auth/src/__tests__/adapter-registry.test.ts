import { describe, it, expect, beforeEach } from 'vitest';
import type { AuthAdapter } from '../adapters/types';

/**
 * Fresh-import the registry for each test to reset module-level state.
 * The adapter registry uses a module-scope Map + activeAdapter variable,
 * so we need dynamic imports with cache-busting to isolate tests.
 */
async function freshRegistry() {
  // vitest caches modules; use resetModules + dynamic import
  const { vi } = await import('vitest');
  vi.resetModules();
  return import('../adapters/registry');
}

function makeAdapter(name: string): AuthAdapter {
  return {
    name,
    verifyToken: async () => null,
    createSession: async () => ({ accessToken: 'tok', expiresIn: 3600 }),
    revokeSession: async () => {},
    verifyApiKey: async () => null,
  };
}

describe('auth adapter registry', () => {
  it('throws when no adapter is registered', async () => {
    const { getAuthAdapter } = await freshRegistry();
    expect(() => getAuthAdapter()).toThrow('No auth adapter registered');
  });

  it('first registered adapter becomes the active one', async () => {
    const { registerAuthAdapter, getAuthAdapter } = await freshRegistry();
    const adapter = makeAdapter('first');
    registerAuthAdapter(adapter);
    expect(getAuthAdapter().name).toBe('first');
  });

  it('registering a second adapter does not change the active one', async () => {
    const { registerAuthAdapter, getAuthAdapter } = await freshRegistry();
    registerAuthAdapter(makeAdapter('first'));
    registerAuthAdapter(makeAdapter('second'));
    expect(getAuthAdapter().name).toBe('first');
  });

  it('setActiveAuthAdapter switches the active adapter', async () => {
    const { registerAuthAdapter, setActiveAuthAdapter, getAuthAdapter } =
      await freshRegistry();
    registerAuthAdapter(makeAdapter('alpha'));
    registerAuthAdapter(makeAdapter('beta'));
    setActiveAuthAdapter('beta');
    expect(getAuthAdapter().name).toBe('beta');
  });

  it('setActiveAuthAdapter throws for unregistered adapter', async () => {
    const { registerAuthAdapter, setActiveAuthAdapter } =
      await freshRegistry();
    registerAuthAdapter(makeAdapter('known'));
    expect(() => setActiveAuthAdapter('unknown')).toThrow(
      'Auth adapter "unknown" not registered'
    );
  });

  it('returns the same adapter object that was registered', async () => {
    const { registerAuthAdapter, getAuthAdapter } = await freshRegistry();
    const adapter = makeAdapter('identity');
    registerAuthAdapter(adapter);
    expect(getAuthAdapter()).toBe(adapter);
  });
});
