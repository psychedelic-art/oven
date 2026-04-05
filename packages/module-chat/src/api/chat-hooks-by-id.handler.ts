import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatHooks } from '../schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const rows = await db.select().from(chatHooks).where(eq(chatHooks.id, Number(id)));
  if (rows.length === 0) return notFound();
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();
  const existing = await db.select().from(chatHooks).where(eq(chatHooks.id, Number(id)));
  if (existing.length === 0) return notFound();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.event !== undefined) updates.event = body.event;
  if (body.handler !== undefined) updates.handler = body.handler;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  const [updated] = await db.update(chatHooks).set(updates).where(eq(chatHooks.id, Number(id))).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const existing = await db.select().from(chatHooks).where(eq(chatHooks.id, Number(id)));
  if (existing.length === 0) return notFound();
  await db.delete(chatHooks).where(eq(chatHooks.id, Number(id)));
  return NextResponse.json({ id: Number(id) });
}
