import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { formDataSources } from '../schema';

// GET /api/form-data-sources/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(formDataSources)
    .where(eq(formDataSources.id, parseInt(id, 10)));

  if (!result) return notFound('Form data source not found');
  return NextResponse.json(result);
}

// PUT /api/form-data-sources/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(formDataSources)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(formDataSources.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Form data source not found');
  return NextResponse.json(result);
}

// DELETE /api/form-data-sources/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(formDataSources)
    .where(eq(formDataSources.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Form data source not found');
  return NextResponse.json(deleted);
}
