import { eq, desc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { chatMessages } from '../schema';

// ─── Token Estimation ───────────────────────────────────────
// Approximate: ~1 token per 4 characters (works for English text).
// Good enough for budget enforcement; not a substitute for tokenizer.

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
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

  // Always include at least the last message
  if (result.length === 0 && messages.length > 0) {
    result.push(messages[messages.length - 1]);
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
