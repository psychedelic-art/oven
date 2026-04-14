import { eq, desc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { chatMessages } from '../schema';

// ─── Token Estimation (F-02-03) ─────────────────────────────
// Approximate token count. The classic `chars / 4` heuristic
// dramatically underestimates token count for:
//   - code and JSON (dense punctuation + identifier splits)
//   - non-latin scripts (1 char often == 1-3 tokens)
//
// Until we adopt a real tokenizer (dependency cost ~1.5 MB), we use a
// shape-aware multiplier that is conservative by construction:
//
//   - plain prose (has spaces, few symbols): chars / 4
//   - code/JSON (many braces, colons, brackets): chars / 2.5
//   - short tokens (< 40 chars): ceil(chars / 3) minimum 1
//
// The heuristic MUST over-estimate (never under-estimate), otherwise
// the truncation routine may let an oversize message slip through to
// the LLM. The unit test in `context-manager.test.ts` covers a
// JSON-heavy fixture and asserts the estimate exceeds the raw /4 value.

const CODE_SHAPE_RE = /[{}\[\]:;,<>()]/g;
const CODE_SHAPE_DENSITY_THRESHOLD = 0.08; // >8% symbol density triggers the code path

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const len = text.length;
  if (len < 40) {
    // Short inputs (slash commands, boolean values) — avoid under-counting
    return Math.max(1, Math.ceil(len / 3));
  }
  const symbolCount = (text.match(CODE_SHAPE_RE) ?? []).length;
  const density = symbolCount / len;
  // Code-shaped text: ~2.5 chars/token (conservative)
  if (density > CODE_SHAPE_DENSITY_THRESHOLD) {
    return Math.ceil(len / 2.5);
  }
  // Prose: classic /4
  return Math.ceil(len / 4);
}

// ─── Get Recent Messages ────────────────────────────────────
// Retrieves the most recent messages for a session, ordered by creation time.

export async function getRecentMessages(
  sessionId: number,
  limit: number = 50,
): Promise<Array<{ id: number; role: string; content: unknown; createdAt: Date }>> {
  const db = getDb();
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  // Reverse to get chronological order (oldest first)
  return (rows as Array<{ id: number; role: string; content: unknown; createdAt: Date }>).reverse();
}

// ─── Truncate to Token Budget ───────────────────────────────
// Drops oldest messages first to fit within budget.
// Always keeps the most recent message.

export function truncateToTokenBudget(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): Array<{ role: string; content: string }> {
  if (messages.length === 0) return [];

  // Calculate total tokens
  let totalTokens = 0;
  const tokenCounts = messages.map(m => {
    const count = estimateTokens(m.content);
    totalTokens += count;
    return count;
  });

  // If within budget, return all
  if (totalTokens <= maxTokens) return messages;

  // Drop from the front (oldest) until we fit
  const result: Array<{ role: string; content: string }> = [];
  let remaining = maxTokens;

  // Work backwards (newest first), collect what fits
  for (let i = messages.length - 1; i >= 0; i--) {
    if (tokenCounts[i] <= remaining) {
      result.unshift(messages[i]);
      remaining -= tokenCounts[i];
    } else {
      break; // Once we can't fit a message, stop
    }
  }

  // Always include at least the last message — with single-message
  // truncation if it alone exceeds the budget (F-02-02). The old
  // behavior kept the whole message, which silently overflowed the
  // model's context window.
  if (result.length === 0 && messages.length > 0) {
    const last = messages[messages.length - 1];
    const lastTokens = tokenCounts[messages.length - 1];
    if (lastTokens <= maxTokens) {
      result.push(last);
    } else {
      // Truncate at a character ratio proportional to the budget.
      // Subtract a small buffer (roughly the ellipsis string) so the
      // truncated result has headroom for the marker.
      const keepChars = Math.max(0, Math.floor(last.content.length * (maxTokens / lastTokens)) - 10);
      const truncated = last.content.slice(0, keepChars) + '… [truncated]';
      result.push({ role: last.role, content: truncated });
    }
  }

  return result;
}

// ─── Build Context Messages ─────────────────────────────────
// Assembles the final message array for the AI model:
// [system, ...history, user]

export function buildContextMessages(input: {
  systemPrompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
}): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  // System prompt
  messages.push({ role: 'system', content: input.systemPrompt });

  // Conversation history
  for (const msg of input.history) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Current user message
  messages.push({ role: 'user', content: input.userMessage });

  return messages;
}

// ─── Extract Text from Content Parts ────────────────────────
// Flattens MessageContentPart[] to a single text string.

export function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: Record<string, unknown>) => p.type === 'text' && p.text)
      .map((p: Record<string, unknown>) => p.text as string)
      .join('\n');
  }
  return '';
}

// ─── Build History from DB Messages ─────────────────────────
// Converts DB message rows to the format needed by buildContextMessages.

export function dbMessagesToHistory(
  dbMessages: Array<{ role: string; content: unknown }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return dbMessages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: extractTextFromContent(m.content),
    }));
}
