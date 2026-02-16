import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { maps, mapChunks, worldConfigs } from '../schema';
import { generateChunkLayerData, type GenerationConfig } from '../generation/perlin';

/**
 * Build generation config from a map and its optional world config.
 */
async function getGenConfig(map: typeof maps.$inferSelect): Promise<Partial<GenerationConfig>> {
  const db = getDb();
  let genConfig: Partial<GenerationConfig> = { seed: map.seed ?? 42 };

  if (map.worldConfigId) {
    const [config] = await db
      .select()
      .from(worldConfigs)
      .where(eq(worldConfigs.id, map.worldConfigId));

    if (config) {
      genConfig = {
        chunkSize: config.chunkSize,
        terrainNoiseScale: config.terrainNoiseScale,
        terrainNoiseOffset: config.terrainNoiseOffset,
        decorationNoiseScale: config.decorationNoiseScale,
        decorationNoiseThreshold: config.decorationNoiseThreshold,
        biomeThresholds: config.biomeThresholds as any,
        seed: map.seed ?? config.seed ?? 42,
      };
    }
  }

  return genConfig;
}

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
    const cx = parseInt(chunkX, 10);
    const cy = parseInt(chunkY, 10);

    const [chunk] = await db
      .select()
      .from(mapChunks)
      .where(
        and(
          eq(mapChunks.mapId, mapId),
          eq(mapChunks.chunkX, cx),
          eq(mapChunks.chunkY, cy)
        )
      );

    // Auto-generate chunk for discovery maps if not found
    if (!chunk && map.mode === 'discovery') {
      const genConfig = await getGenConfig(map);
      const layerData = generateChunkLayerData(cx, cy, genConfig);

      const [newChunk] = await db
        .insert(mapChunks)
        .values({ mapId, chunkX: cx, chunkY: cy, layerData })
        .onConflictDoUpdate({
          target: [mapChunks.mapId, mapChunks.chunkX, mapChunks.chunkY],
          set: { layerData, updatedAt: new Date() },
        })
        .returning();

      // Update total chunks count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(mapChunks)
        .where(eq(mapChunks.mapId, mapId));

      await db
        .update(maps)
        .set({ totalChunks: countResult.count, updatedAt: new Date() })
        .where(eq(maps.id, mapId));

      return NextResponse.json(newChunk);
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const mapId = parseInt(id, 10);
  const body = await request.json();
  const { chunkX, chunkY } = body;

  if (chunkX == null || chunkY == null) {
    return NextResponse.json({ error: 'chunkX and chunkY are required' }, { status: 400 });
  }

  // Delete the chunk
  await db
    .delete(mapChunks)
    .where(
      and(
        eq(mapChunks.mapId, mapId),
        eq(mapChunks.chunkX, chunkX),
        eq(mapChunks.chunkY, chunkY)
      )
    );

  // Update total chunks count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mapChunks)
    .where(eq(mapChunks.mapId, mapId));

  await db
    .update(maps)
    .set({ totalChunks: countResult.count, updatedAt: new Date() })
    .where(eq(maps.id, mapId));

  return NextResponse.json({ ok: true });
}
