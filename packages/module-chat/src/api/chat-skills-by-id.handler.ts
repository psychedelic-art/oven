import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatSkills } from '../schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const rows = await db.select().from(chatSkills).where(eq(chatSkills.id, Number(id)));
  if (rows.length === 0) return notFound();
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();
  const existing = await db.select().from(chatSkills).where(eq(chatSkills.id, Number(id)));
  if (existing.length === 0) return notFound();
  if (existing[0].isBuiltIn) return badRequest('Cannot modify built-in skills');
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.promptTemplate !== undefined) updates.promptTemplate = body.promptTemplate;
  if (body.source !== undefined) updates.source = body.source;
  if (body.params !== undefined) updates.params = body.params;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  const [updated] = await db.update(chatSkills).set(updates).where(eq(chatSkills.id, Number(id))).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const existing = await db.select().from(chatSkills).where(eq(chatSkills.id, Number(id)));
  if (existing.length === 0) return notFound();
  if (existing[0].isBuiltIn) return badRequest('Cannot delete built-in skills');
  await db.delete(chatSkills).where(eq(chatSkills.id, Number(id)));
  return NextResponse.json({ id: Number(id) });
}
