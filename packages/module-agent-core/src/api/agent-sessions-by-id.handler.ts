import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentSessions, agentMessages } from '../schema';
import { archiveSession } from '../engine/session-manager';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const sessions = await db.select().from(agentSessions).where(eq(agentSessions.id, Number(id)));
  if (sessions.length === 0) return notFound();
  const messages = await db.select().from(agentMessages).where(eq(agentMessages.sessionId, Number(id))).orderBy(agentMessages.createdAt);
  return NextResponse.json({ ...sessions[0], messages });
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  await archiveSession(Number(id));
  return NextResponse.json({ id: Number(id) });
}
