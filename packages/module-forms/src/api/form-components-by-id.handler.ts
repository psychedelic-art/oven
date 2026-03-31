import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { formComponents } from '../schema';

// GET /api/form-components/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(formComponents)
    .where(eq(formComponents.id, parseInt(id, 10)));

  if (!result) return notFound('Form component not found');
  return NextResponse.json(result);
}

// PUT /api/form-components/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(formComponents)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(formComponents.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Form component not found');
  return NextResponse.json(result);
}

// DELETE /api/form-components/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(formComponents)
    .where(eq(formComponents.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Form component not found');
  return NextResponse.json(deleted);
}
