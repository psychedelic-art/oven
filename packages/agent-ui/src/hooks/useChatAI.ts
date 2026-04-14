'use client';

// ─── useChatAI ──────────────────────────────────────────────
// Wraps @ai-sdk/react's useChat with OVEN's session management.
// Returns the same UseChatReturn interface as the legacy hook so
// consumers don't need to change.
//
// Reference: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
//
// Note on streaming protocol: our backend emits a custom SSE event
// format (type: token/done/error) that does NOT match Vercel's default
// DataStream protocol. Until the backend is migrated to emit the AI
// SDK protocol (or we write a proper ChatTransport adapter), this hook
// delegates to `useChatLegacy` for actual streaming. The AI SDK state
// layer is preserved here as scaffolding for a future migration.

import { useChatLegacy } from './useChatLegacy';
import type { UseChatReturn } from '../types';

export interface UseChatAIOpts {
  tenantSlug: string;
  agentSlug?: string;
  agentId?: number;
  apiBaseUrl?: string;
}

/**
 * Currently delegates to useChatLegacy until @ai-sdk/react's protocol
 * is aligned with our backend SSE format. The hook surface is kept
 * stable so switching the implementation back to the AI SDK path in the
 * future is a one-liner.
 *
 * @see packages/agent-ui/src/hooks/OvenChatTransport.ts — a custom
 *      ChatTransport that parses our SSE format is scaffolded but
 *      not yet wired since @ai-sdk/react v1.2 accepts `api` + URL
 *      rather than a transport instance.
 */
export function useChatAI(opts: UseChatAIOpts): UseChatReturn {
  return useChatLegacy(opts);
}
