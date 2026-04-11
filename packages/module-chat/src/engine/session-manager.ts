import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatSessions } from '../schema';
import type { CreateSessionInput, SessionChannel } from '../types';
import { randomBytes } from 'crypto';

// ─── Create Session ─────────────────────────────────────────

export async function createSession(input: CreateSessionInput & { userId?: number; channel?: SessionChannel }) {
  const db = getDb();
  const isAnonymous = !input.userId;
  const sessionToken = isAnonymous ? generateSessionToken() : null;

  const [session] = await db
    .insert(chatSessions)
    .values({
      tenantId: input.tenantId ?? null,
      agentId: input.agentId ?? null,
      userId: input.userId ?? null,
      sessionToken,
      channel: input.channel ?? 'web',
      title: input.title ?? null,
      status: 'active',
    })
    .returning();

  await eventBus.emit('chat.session.created', {
    id: session.id,
    tenantId: session.tenantId,
    agentId: session.agentId,
    userId: input.userId ?? null,
    channel: session.channel,
  });

  return session;
}

// ─── Resume Session ─────────────────────────────────────────

export async function resumeSession(sessionId: number) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.id, sessionId))
    .limit(1);

  if (!session || session.status !== 'active') {
    return null;
  }

  return session;
}

// ─── Archive Session ────────────────────────────────────────

export async function archiveSession(sessionId: number) {
  const db = getDb();
  const [updated] = await db
    .update(chatSessions)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId))
    .returning();

  if (updated) {
    await eventBus.emit('chat.session.archived', {
      id: updated.id,
      tenantId: updated.tenantId,
      agentId: updated.agentId,
    });
  }

  return updated ?? null;
}

// ─── Validate Session Access ────────────────────────────────

export function validateSessionAccess(
  session: { userId: number | null; sessionToken: string | null },
  credentials: { userId?: number; sessionToken?: string },
): boolean {
  if (credentials.userId && session.userId === credentials.userId) {
    return true;
  }
  if (credentials.sessionToken && session.sessionToken === credentials.sessionToken) {
    return true;
  }
  return false;
}

// ─── Resolve Backing Agent ──────────────────────────────────
// Cascade: explicit agentSlug > tenant default config > platform default

export async function resolveBackingAgent(input: {
  agentSlug?: string;
  agentId?: number;
  tenantId?: number;
}): Promise<number | null> {
  // If explicit agentId provided, use it directly
  if (input.agentId) return input.agentId;

  // If agentSlug provided, look up agent by slug
  // This would call module-agent-core API but for now return null
  // TODO: implement agent slug resolution via agent-core
  if (input.agentSlug) return null;

  // TODO: Resolve from tenant config (CHAT_DEFAULT_AGENT)
  // TODO: Resolve from platform config (CHAT_DEFAULT_AGENT)
  return null;
}

// ─── Helpers ────────────────────────────────────────────────

function generateSessionToken(): string {
  return `tok_${randomBytes(64).toString('hex')}`;
}
