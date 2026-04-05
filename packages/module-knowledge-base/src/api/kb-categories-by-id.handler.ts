import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { kbCategories, kbEntries } from '../schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const db = getDb();

  const rows = await db.select().from(kbCategories).where(eq(kbCategories.id, Number(id)));
  if (rows.length === 0) return notFound();

  const [{ count }] = await db
    .select({ count: sql`count(*)` })
    .from(kbEntries)
    .where(eq(kbEntries.categoryId, Number(id)));

  return NextResponse.json({ ...rows[0], entryCount: Number(count) });
}

export async function PUT(
  request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const body = await request.json();
  const db = getDb();

  const existing = await db.select().from(kbCategories).where(eq(kbCategories.id, Number(id)));
  if (existing.length === 0) return notFound();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.description !== undefined) updates.description = body.description;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.order !== undefined) updates.order = body.order;
  if (body.enabled !== undefined) updates.enabled = body.enabled;

  const [updated] = await db.update(kbCategories)
    .set(updates)
    .where(eq(kbCategories.id, Number(id)))
    .returning();

  await eventBus.emit('kb.category.updated', {
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

  const existing = await db.select().from(kbCategories).where(eq(kbCategories.id, Number(id)));
  if (existing.length === 0) return notFound();

  // Check if category has entries
  const [{ count }] = await db
    .select({ count: sql`count(*)` })
    .from(kbEntries)
    .where(eq(kbEntries.categoryId, Number(id)));

  if (Number(count) > 0) {
    return badRequest(`Cannot delete category with ${count} entries. Move or delete entries first.`);
  }

  await db.delete(kbCategories).where(eq(kbCategories.id, Number(id)));

  await eventBus.emit('kb.category.deleted', {
    id: existing[0].id,
    tenantId: existing[0].tenantId,
    slug: existing[0].slug,
  });

  return NextResponse.json({ id: Number(id) });
}
