import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { maps, mapChunks } from '../schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const mapId = parseInt(id, 10);

  // Verify map exists
  const [map] = await db.select().from(maps).where(eq(maps.id, mapId));
  if (!map) return notFound('Map not found');

  const url = request.nextUrl;
  const chunkX = url.searchParams.get('chunk_x');
  const chunkY = url.searchParams.get('chunk_y');

  // If specific chunk requested
  if (chunkX !== null && chunkY !== null) {
    const [chunk] = await db
      .select()
      .from(mapChunks)
      .where(
        and(
          eq(mapChunks.mapId, mapId),
          eq(mapChunks.chunkX, parseInt(chunkX, 10)),
          eq(mapChunks.chunkY, parseInt(chunkY, 10))
        )
      );

    if (!chunk) return notFound('Chunk not found');
    return NextResponse.json(chunk);
  }

  // List all chunks for this map
  const chunks = await db
    .select()
    .from(mapChunks)
    .where(eq(mapChunks.mapId, mapId));

  return NextResponse.json(chunks);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const mapId = parseInt(id, 10);
  const body = await request.json();

  // Upsert chunk data
  const [result] = await db
    .insert(mapChunks)
    .values({ ...body, mapId })
    .onConflictDoUpdate({
      target: [mapChunks.mapId, mapChunks.chunkX, mapChunks.chunkY],
      set: {
        layerData: body.layerData,
        version: sql`${mapChunks.version} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Update total_chunks count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mapChunks)
    .where(eq(mapChunks.mapId, mapId));

  await db
    .update(maps)
    .set({ totalChunks: countResult.count })
    .where(eq(maps.id, mapId));

  return NextResponse.json(result, { status: 201 });
}
