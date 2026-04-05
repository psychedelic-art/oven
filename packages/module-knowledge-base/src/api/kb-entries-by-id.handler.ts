import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { kbEntries, kbEntryVersions, kbCategories } from '../schema';
import { embedEntry } from '../engine/embedding-pipeline';
import { eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const db = getDb();

  const rows = await db.select().from(kbEntries).where(eq(kbEntries.id, Number(id)));
  if (rows.length === 0) return notFound();

  const entry = rows[0];

  // Join category info
  const cats = await db.select().from(kbCategories).where(eq(kbCategories.id, entry.categoryId));
  const category = cats.length > 0
    ? { id: cats[0].id, name: cats[0].name, slug: cats[0].slug }
    : null;

  return NextResponse.json({ ...entry, category });
}

export async function PUT(
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const body = await request.json();
  const db = getDb();

  const rows = await db.select().from(kbEntries).where(eq(kbEntries.id, Number(id)));
  if (rows.length === 0) return notFound();

  const existing = rows[0];
  const contentChanged = (body.question && body.question !== existing.question) ||
    (body.answer && body.answer !== existing.answer);

  // If content changed, create a version snapshot BEFORE updating
  if (contentChanged) {
    await db.insert(kbEntryVersions).values({
      entryId: existing.id,
      version: existing.version,
      question: existing.question,
      answer: existing.answer,
      keywords: existing.keywords,
      description: body.versionDescription ?? null,
    });
  }

  // Build update object
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.question !== undefined) updates.question = body.question;
  if (body.answer !== undefined) updates.answer = body.answer;
  if (body.keywords !== undefined) updates.keywords = body.keywords;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.categoryId !== undefined) updates.categoryId = Number(body.categoryId);
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.language !== undefined) updates.language = body.language;
  if (body.enabled !== undefined) updates.enabled = body.enabled;

  if (contentChanged) {
    updates.version = existing.version + 1;
    updates.metadata = {
      ...(existing.metadata as Record<string, unknown> ?? {}),
      embeddingStatus: 'pending',
    };
  }

  const [updated] = await db.update(kbEntries)
    .set(updates)
    .where(eq(kbEntries.id, Number(id)))
    .returning();

  await eventBus.emit('kb.entry.updated', {
    id: updated.id,
    tenantId: updated.tenantId,
    question: updated.question,
    version: updated.version,
  });

  // Re-embed if content changed (non-blocking)
  if (contentChanged) {
    embedEntry(updated.id).catch((err) => {
      console.error(`[KB] Failed to re-embed entry ${updated.id}:`, err);
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const db = getDb();

  const rows = await db.select().from(kbEntries).where(eq(kbEntries.id, Number(id)));
  if (rows.length === 0) return notFound();

  const entry = rows[0];

  // Delete version history first
  await db.delete(kbEntryVersions).where(eq(kbEntryVersions.entryId, Number(id)));
  // Delete entry
  await db.delete(kbEntries).where(eq(kbEntries.id, Number(id)));

  await eventBus.emit('kb.entry.deleted', {
    id: entry.id,
    tenantId: entry.tenantId,
    question: entry.question,
  });

  return NextResponse.json({ id: Number(id) });
}
