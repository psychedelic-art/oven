import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { forms } from '../schema';

// GET /api/forms/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(forms)
    .where(eq(forms.id, parseInt(id, 10)));

  if (!result) return notFound('Form not found');
  return NextResponse.json(result);
}

// PUT /api/forms/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [current] = await db
    .select()
    .from(forms)
    .where(eq(forms.id, parseInt(id, 10)));

  if (!current) return notFound('Form not found');

  const [result] = await db
    .update(forms)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(forms.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Form not found');

  eventBus.emit('forms.form.updated', {
    id: result.id,
    tenantId: result.tenantId,
    name: result.name,
  });

  // Check if status changed to published
  if (body.status === 'published' && current.status !== 'published') {
    eventBus.emit('forms.form.published', {
      id: result.id,
      tenantId: result.tenantId,
      version: result.version,
    });
  }

  return NextResponse.json(result);
}

// DELETE /api/forms/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(forms)
    .where(eq(forms.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Form not found');

  eventBus.emit('forms.form.archived', {
    id: deleted.id,
    tenantId: deleted.tenantId,
    name: deleted.name,
  });

  return NextResponse.json(deleted);
}
