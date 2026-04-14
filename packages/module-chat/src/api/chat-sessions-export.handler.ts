import type { NextRequest } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatSessions, chatMessages } from '../schema';
import { eq, asc } from 'drizzle-orm';

// ─── Chat Sessions Export Handler ──────────────────────────
// GET /api/chat-sessions/[id]/export?format=json|markdown|plaintext
// Returns the session + messages as a downloadable file. Clients
// (the playground session sidebar) trigger this via anchor download.

type ExportFormat = 'json' | 'markdown' | 'plaintext';

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((p): p is { type: string; text?: string } =>
        p !== null && typeof p === 'object' && 'type' in p,
      )
      .filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join('');
  }
  return '';
}

export async function GET(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const url = new URL(req.url);
  const formatParam = url.searchParams.get('format') ?? 'json';
  const format: ExportFormat =
    formatParam === 'markdown' ? 'markdown' :
    formatParam === 'plaintext' ? 'plaintext' :
    'json';

  const db = getDb();
  const sessions = await db.select().from(chatSessions).where(eq(chatSessions.id, Number(id)));
  if (sessions.length === 0) return notFound('Session not found');
  const session = sessions[0];

  const messages = await db.select().from(chatMessages)
    .where(eq(chatMessages.sessionId, Number(id)))
    .orderBy(asc(chatMessages.createdAt));

  let body: string;
  let contentType: string;
  let ext: string;

  if (format === 'markdown') {
    const title = session.title ?? `Session ${id}`;
    const lines: string[] = [`# ${title}`, ''];
    for (const m of messages) {
      const ts = m.createdAt instanceof Date
        ? m.createdAt.toISOString()
        : new Date(m.createdAt as string).toISOString();
      lines.push(`**${m.role}** (${ts}):`);
      lines.push(extractText(m.content));
      lines.push('');
    }
    body = lines.join('\n');
    contentType = 'text/markdown; charset=utf-8';
    ext = 'md';
  } else if (format === 'plaintext') {
    body = messages
      .map((m) => `[${m.role}] ${extractText(m.content)}`)
      .join('\n\n');
    contentType = 'text/plain; charset=utf-8';
    ext = 'txt';
  } else {
    body = JSON.stringify({ session, messages }, null, 2);
    contentType = 'application/json; charset=utf-8';
    ext = 'json';
  }

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="session-${id}.${ext}"`,
      'Cache-Control': 'no-store',
    },
  });
}
