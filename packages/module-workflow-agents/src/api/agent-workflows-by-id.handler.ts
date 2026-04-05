import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agentWorkflows } from '../schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const rows = await db.select().from(agentWorkflows).where(eq(agentWorkflows.id, Number(id)));
  if (rows.length === 0) return notFound();
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();
  const existing = await db.select().from(agentWorkflows).where(eq(agentWorkflows.id, Number(id)));
  if (existing.length === 0) return notFound();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;
  if (body.definition !== undefined) updates.definition = body.definition;
  if (body.agentConfig !== undefined) updates.agentConfig = body.agentConfig;
  if (body.memoryConfig !== undefined) updates.memoryConfig = body.memoryConfig;
  if (body.status !== undefined) updates.status = body.status;
  if (body.agentId !== undefined) updates.agentId = body.agentId;
  const [updated] = await db.update(agentWorkflows).set(updates).where(eq(agentWorkflows.id, Number(id))).returning();
  await eventBus.emit('workflow-agents.workflow.updated', { id: updated.id, name: updated.name, version: updated.version });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const existing = await db.select().from(agentWorkflows).where(eq(agentWorkflows.id, Number(id)));
  if (existing.length === 0) return notFound();
  await db.delete(agentWorkflows).where(eq(agentWorkflows.id, Number(id)));
  await eventBus.emit('workflow-agents.workflow.deleted', { id: Number(id), name: existing[0].name });
  return NextResponse.json({ id: Number(id) });
}
