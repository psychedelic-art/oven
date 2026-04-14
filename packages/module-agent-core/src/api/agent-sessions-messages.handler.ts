import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agents, agentSessions } from '../schema';
import { getSessionMessages } from '../engine/session-manager';
import { invokeAgent } from '../engine/agent-invoker';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const messages = await getSessionMessages(Number(id));
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();
  if (!body.content) return badRequest('Missing required field: content');
  // Get session to find agent
  const sessions = await db.select().from(agentSessions).where(eq(agentSessions.id, Number(id)));
  if (sessions.length === 0) return badRequest('Session not found');
  const session = sessions[0];
  if (session.agentId === null || session.agentId === undefined) {
    return badRequest('Session has no agent');
  }
  // Get agent slug (F-04-01: typed drizzle select, no dynamic require)
  const agentRows = await db
    .select({ slug: agents.slug })
    .from(agents)
    .where(eq(agents.id, session.agentId as number))
    .limit(1);
  const agentSlug = agentRows[0]?.slug;
  if (!agentSlug) return badRequest('Agent not found');
  // Invoke agent with the message
  const result = await invokeAgent(agentSlug, {
    messages: [{ role: body.role ?? 'user', content: body.content }],
    sessionId: Number(id),
  }, { tenantId: session.tenantId ?? undefined });
  return NextResponse.json(result);
}
