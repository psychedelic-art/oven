import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatMcpConnections } from '../schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const rows = await db.select().from(chatMcpConnections).where(eq(chatMcpConnections.id, Number(id)));
  if (rows.length === 0) return notFound();
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();
  const existing = await db.select().from(chatMcpConnections).where(eq(chatMcpConnections.id, Number(id)));
  if (existing.length === 0) return notFound();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.url !== undefined) updates.url = body.url;
  if (body.transport !== undefined) updates.transport = body.transport;
  if (body.credentials !== undefined) updates.credentials = body.credentials;
  if (body.status !== undefined) updates.status = body.status;
  if (body.discoveredTools !== undefined) updates.discoveredTools = body.discoveredTools;
  if (body.status === 'connected') updates.lastConnectedAt = new Date();
  const [updated] = await db.update(chatMcpConnections).set(updates).where(eq(chatMcpConnections.id, Number(id))).returning();
  if (body.status === 'connected' && existing[0].status !== 'connected') {
    await eventBus.emit('chat.mcp.connected', { connectionId: updated.id, tenantId: updated.tenantId, name: updated.name });
  }
  if (body.status === 'disconnected' && existing[0].status === 'connected') {
    await eventBus.emit('chat.mcp.disconnected', { connectionId: updated.id, tenantId: updated.tenantId });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const existing = await db.select().from(chatMcpConnections).where(eq(chatMcpConnections.id, Number(id)));
  if (existing.length === 0) return notFound();
  await db.delete(chatMcpConnections).where(eq(chatMcpConnections.id, Number(id)));
  if (existing[0].status === 'connected') {
    await eventBus.emit('chat.mcp.disconnected', { connectionId: Number(id), tenantId: existing[0].tenantId });
  }
  return NextResponse.json({ id: Number(id) });
}
