import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { tileDefinitions } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(tileDefinitions)
    .where(eq(tileDefinitions.id, parseInt(id, 10)));

  if (!result) return notFound('Tile definition not found');
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  const [result] = await db
    .update(tileDefinitions)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tileDefinitions.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Tile definition not found');
  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .delete(tileDefinitions)
    .where(eq(tileDefinitions.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Tile definition not found');
  return NextResponse.json(result);
}
