'use client';

// ─── useChat — Feature-flagged chat hook ────────────────────
//
// Delegates to either:
//   - useChatAI (default) — @ai-sdk/react with OvenChatTransport
//   - useChatLegacy — hand-rolled SSE parser (fallback)
//
// The AI SDK version is the default because it provides better
// streaming state management, abort handling, and tool call support.
// The legacy version is kept as a fallback until backend streaming
// (module-chat Sprint 4A.4) is fully verified in production.
//
// Consumers don't need to change — the return type (UseChatReturn)
// is identical for both implementations.

import { useChatAI } from './useChatAI';
import { useChatLegacy } from './useChatLegacy';
import type { UseChatReturn } from '../types';

export interface UseChatOpts {
  tenantSlug: string;
  agentSlug?: string;
  agentId?: number;
  apiBaseUrl?: string;
  /**
   * Use the legacy SSE parser instead of @ai-sdk/react.
   * Defaults to false (AI SDK is the default).
   * Set to true if the backend doesn't support the AI SDK transport yet.
   */
  useLegacy?: boolean;
}

export function useChat(opts: UseChatOpts): UseChatReturn {
  if (opts.useLegacy) {
    return useChatLegacy(opts);
  }
  return useChatAI(opts);
}

// Re-export both implementations for consumers that need explicit control
export { useChatAI } from './useChatAI';
export { useChatLegacy } from './useChatLegacy';
export { OvenChatTransport } from './OvenChatTransport';
