import type { AuthAdapter } from './types';

// ─── Adapter Registry ────────────────────────────────────────────
// Maintains a map of registered auth adapters and tracks
// which one is currently active. The first adapter registered
// becomes the active one by default.

const adapters = new Map<string, AuthAdapter>();
let activeAdapter: AuthAdapter | null = null;

/**
 * Register an auth adapter. If no adapter is active yet,
 * this one becomes the default.
 */
export function registerAuthAdapter(adapter: AuthAdapter) {
  adapters.set(adapter.name, adapter);
  if (!activeAdapter) activeAdapter = adapter;
}

/**
 * Switch the active adapter by name.
 * Throws if the named adapter hasn't been registered.
 */
export function setActiveAuthAdapter(name: string) {
  const adapter = adapters.get(name);
  if (!adapter) throw new Error(`Auth adapter "${name}" not registered`);
  activeAdapter = adapter;
}

/**
 * Get the currently active auth adapter.
 * Throws if no adapter has been registered.
 */
export function getAuthAdapter(): AuthAdapter {
  if (!activeAdapter) throw new Error('No auth adapter registered');
  return activeAdapter;
}
