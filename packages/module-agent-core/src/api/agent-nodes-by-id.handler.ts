import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agentNodeDefinitions } from '../schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const rows = await db.select().from(agentNodeDefinitions).where(eq(agentNodeDefinitions.id, Number(id)));
  if (rows.length === 0) return notFound();
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();
  const existing = await db.select().from(agentNodeDefinitions).where(eq(agentNodeDefinitions.id, Number(id)));
  if (existing.length === 0) return notFound();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ['name', 'slug', 'category', 'description', 'inputs', 'outputs', 'config']) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  const [updated] = await db.update(agentNodeDefinitions).set(updates).where(eq(agentNodeDefinitions.id, Number(id))).returning();
  await eventBus.emit('agents.node.updated', { id: updated.id, name: updated.name, category: updated.category });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const existing = await db.select().from(agentNodeDefinitions).where(eq(agentNodeDefinitions.id, Number(id)));
  if (existing.length === 0) return notFound();
  await db.delete(agentNodeDefinitions).where(eq(agentNodeDefinitions.id, Number(id)));
  await eventBus.emit('agents.node.deleted', { id: Number(id) });
  return NextResponse.json({ id: Number(id) });
}
