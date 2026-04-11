import type { NotificationAdapter, ChannelType } from '../types';

// In-memory registry of notification adapters. Populated at app startup
// from apps/dashboard/src/lib/modules.ts via registerNotificationAdapter().
// This package never imports adapter packages directly (Rule 3.3).
const adapters = new Map<string, NotificationAdapter>();

/**
 * Register a notification adapter by name. Throws if an adapter with
 * the same name is already registered — fail-fast catches duplicate
 * wiring at boot.
 */
export function registerNotificationAdapter(adapter: NotificationAdapter): void {
  if (!adapter || typeof adapter.name !== 'string' || adapter.name.length === 0) {
    throw new Error('registerNotificationAdapter: adapter.name is required');
  }
  if (adapters.has(adapter.name)) {
    throw new Error(
      `registerNotificationAdapter: adapter "${adapter.name}" is already registered`
    );
  }
  adapters.set(adapter.name, adapter);
}

/**
 * Return the registered adapter for a name, or null if none is registered.
 */
export function getAdapter(name: string): NotificationAdapter | null {
  return adapters.get(name) ?? null;
}

/**
 * Return the first adapter that handles a given channel type, or null
 * if none is registered. Used by the dashboard to suggest a default
 * adapter when creating a new channel.
 */
export function getAdapterForChannelType(
  channelType: ChannelType
): NotificationAdapter | null {
  for (const adapter of adapters.values()) {
    if (adapter.channelType === channelType) return adapter;
  }
  return null;
}

/**
 * Frozen snapshot of all registered adapters. The returned array is
 * safe to pass to UI components without leaking references.
 */
export function listAdapters(): ReadonlyArray<NotificationAdapter> {
  return Object.freeze([...adapters.values()]);
}

/**
 * Test-only: clear the registry between tests. Not exported from the
 * package entry point — only consumed via the internal path.
 */
export function clearAdapters(): void {
  adapters.clear();
}
