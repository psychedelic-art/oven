import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { withHandler } from '@oven/module-registry/api-errors';
import { tilesets, tileDefinitions } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(tilesets)
    .where(eq(tilesets.id, parseInt(id, 10)));

  if (!result) return notFound('Tileset not found');
  return NextResponse.json(result);
}

export const PUT = withHandler(async (
  request: NextRequest,
  ctx?: { params: Promise<Record<string, string>> }
) => {
  const db = getDb();
  const { id } = await ctx!.params;
  const body = await request.json();
  const [result] = await db
    .update(tilesets)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(tilesets.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Tileset not found');
  return NextResponse.json(result);
});

export const DELETE = withHandler(async (
  request: NextRequest,
  ctx?: { params: Promise<Record<string, string>> }
) => {
  const db = getDb();
  const { id } = await ctx!.params;
  const tilesetId = parseInt(id, 10);
  const cascade = request.nextUrl.searchParams.get('cascade') === 'true';

  if (cascade) {
    // Delete all tiles belonging to this tileset first
    await db
      .delete(tileDefinitions)
      .where(eq(tileDefinitions.tilesetId, tilesetId));
  }
  // FK is onDelete: 'set null', so remaining tiles get tilesetId=null

  const [result] = await db
    .delete(tilesets)
    .where(eq(tilesets.id, tilesetId))
    .returning();

  if (!result) return notFound('Tileset not found');
  return NextResponse.json(result);
});
