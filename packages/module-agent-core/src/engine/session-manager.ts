import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agentSessions, agentMessages } from '../schema';
import { eq, desc } from 'drizzle-orm';

// ─── Session Management ─────────────────────────────────────

/**
 * Get or create a session for an agent conversation.
 */
export async function getOrCreateSession(params: {
  agentId: number;
  sessionId?: number;
  tenantId?: number;
  userId?: number;
  isPlayground?: boolean;
}): Promise<{ id: number; isNew: boolean }> {
  const db = getDb();
  const { agentId, sessionId, tenantId, userId, isPlayground = false } = params;

  // If sessionId provided, verify it exists
  if (sessionId) {
    const existing = await db.select().from(agentSessions)
      .where(eq(agentSessions.id, sessionId))
      .limit(1);
    if (existing.length > 0) {
      return { id: existing[0].id, isNew: false };
    }
  }

  // Create a new session
  const [session] = await db.insert(agentSessions).values({
    agentId,
    tenantId: tenantId ?? null,
    userId: userId ?? null,
    status: 'active',
    isPlayground,
    context: {},
  }).returning();

  await eventBus.emit('agents.session.created', {
    id: session.id,
    agentId,
    userId: userId ?? null,
  });

  return { id: session.id, isNew: true };
}

/**
 * Append a message to a session.
 */
export async function appendMessage(params: {
  sessionId: number;
  role: string;
  content: unknown;
  toolCalls?: unknown;
  toolResults?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const db = getDb();
  const { sessionId, role, content, toolCalls, toolResults, metadata } = params;

  const [message] = await db.insert(agentMessages).values({
    sessionId,
    role,
    content,
    toolCalls: toolCalls ?? null,
    toolResults: toolResults ?? null,
    metadata: metadata ?? null,
  }).returning();

  await eventBus.emit('agents.message.sent', {
    id: message.id,
    sessionId,
    role,
  });

  return message.id;
}

/**
 * Get message history for a session.
 */
export async function getSessionMessages(sessionId: number): Promise<Array<Record<string, unknown>>> {
  const db = getDb();
  return db.select().from(agentMessages)
    .where(eq(agentMessages.sessionId, sessionId))
    .orderBy(agentMessages.createdAt);
}

/**
 * Archive a session.
 */
export async function archiveSession(sessionId: number): Promise<void> {
  const db = getDb();
  const [session] = await db.select().from(agentSessions)
    .where(eq(agentSessions.id, sessionId))
    .limit(1);

  if (!session) return;

  await db.update(agentSessions)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(agentSessions.id, sessionId));

  await eventBus.emit('agents.session.archived', {
    id: sessionId,
    agentId: session.agentId,
    userId: session.userId,
  });
}
