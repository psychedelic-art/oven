import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatSessions } from '../schema';
import { archiveSession } from '../engine/session-manager';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const rows = await db.select().from(chatSessions).where(eq(chatSessions.id, Number(id)));
  if (rows.length === 0) return notFound();
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();
  const existing = await db.select().from(chatSessions).where(eq(chatSessions.id, Number(id)));
  if (existing.length === 0) return notFound();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.isPinned !== undefined) updates.isPinned = body.isPinned;
  if (body.agentId !== undefined) updates.agentId = Number(body.agentId);
  if (body.context !== undefined) updates.context = body.context;
  if (body.status !== undefined) updates.status = body.status;
  const [updated] = await db.update(chatSessions).set(updates).where(eq(chatSessions.id, Number(id))).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const result = await archiveSession(Number(id));
  if (!result) return notFound();
  return NextResponse.json({ id: Number(id) });
}
