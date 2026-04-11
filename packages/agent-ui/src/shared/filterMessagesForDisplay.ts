import type { UIMessage } from '../types';

/**
 * Ported from newsan's `filterMessagesForDisplay()` util.
 *
 * Rules:
 * - Always show user messages.
 * - Always show system messages.
 * - Always show tool messages (tool call results are part of the trace).
 * - Always show messages that carry an error.
 * - Always show assistant messages that are currently streaming (even if empty).
 * - Hide assistant messages that are empty (no content and no meaningful parts)
 *   and not streaming — these are the "garbage row" placeholders newsan
 *   learned to suppress.
 */
export function filterMessagesForDisplay(messages: UIMessage[]): UIMessage[] {
  return messages.filter(msg => {
    if (msg.error) return true;
    if (msg.role === 'user' || msg.role === 'system' || msg.role === 'tool') return true;
    if (msg.role === 'assistant') {
      if (msg.isStreaming) return true;
      const hasContent = typeof msg.content === 'string' && msg.content.trim().length > 0;
      if (hasContent) return true;
      const meaningfulParts = (msg.parts ?? []).some(
        p => p.type === 'tool-call' || p.type === 'tool-result'
          || (p.type === 'text' && typeof p.text === 'string' && p.text.trim().length > 0)
          || p.type === 'image',
      );
      return meaningfulParts;
    }
    return true;
  });
}
