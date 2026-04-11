import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { kbKnowledgeBases, kbEntries } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const db = getDb();

  const rows = await db.select().from(kbKnowledgeBases).where(eq(kbKnowledgeBases.id, Number(id)));
  if (rows.length === 0) return notFound();

  const [{ count }] = await db
    .select({ count: sql`count(*)` })
    .from(kbEntries)
    .where(eq(kbEntries.knowledgeBaseId, Number(id)));

  return NextResponse.json({ ...rows[0], entryCount: Number(count) });
}

export async function PUT(
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const body = await request.json();
  const db = getDb();

  const existing = await db.select().from(kbKnowledgeBases).where(eq(kbKnowledgeBases.id, Number(id)));
  if (existing.length === 0) return notFound();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.description !== undefined) updates.description = body.description;
  if (body.enabled !== undefined) updates.enabled = body.enabled;
  if (body.metadata !== undefined) updates.metadata = body.metadata;

  const [updated] = await db.update(kbKnowledgeBases)
    .set(updates)
    .where(eq(kbKnowledgeBases.id, Number(id)))
    .returning();

  await eventBus.emit('kb.knowledgeBase.updated', {
    id: updated.id,
    tenantId: updated.tenantId,
    name: updated.name,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const db = getDb();

  const existing = await db.select().from(kbKnowledgeBases).where(eq(kbKnowledgeBases.id, Number(id)));
  if (existing.length === 0) return notFound();

  await db.delete(kbKnowledgeBases).where(eq(kbKnowledgeBases.id, Number(id)));

  await eventBus.emit('kb.knowledgeBase.deleted', {
    id: existing[0].id,
    tenantId: existing[0].tenantId,
    slug: existing[0].slug,
  });

  return NextResponse.json({ id: Number(id) });
}
