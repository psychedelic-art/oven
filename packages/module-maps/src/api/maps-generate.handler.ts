import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { maps, mapChunks, worldConfigs } from '../schema';
import { generateChunkLayerData, type GenerationConfig } from '../generation/perlin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const mapId = parseInt(id, 10);

  const [map] = await db.select().from(maps).where(eq(maps.id, mapId));
  if (!map) return notFound('Map not found');

  if (map.status === 'generating') {
    return badRequest('Map is already being generated');
  }

  // Mark as generating
  await db
    .update(maps)
    .set({ status: 'generating', updatedAt: new Date() })
    .where(eq(maps.id, mapId));

  try {
    // Load world config if available
    let genConfig: Partial<GenerationConfig> = {
      seed: map.seed ?? 42,
    };

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

    // Determine generation range
    let radius = 2; // Default 5x5 grid (25 chunks)
    const url = request.nextUrl;
    const radiusParam = url.searchParams.get('radius');
    if (radiusParam) {
      radius = Math.min(parseInt(radiusParam, 10), 10); // Max 10 (21x21 = 441 chunks)
    }

    // For prebuilt maps with bounds, generate within bounds
    let minCX = -radius, maxCX = radius, minCY = -radius, maxCY = radius;

    if (map.boundsMinX !== null && map.boundsMaxX !== null &&
        map.boundsMinY !== null && map.boundsMaxY !== null) {
      const chunkSize = genConfig.chunkSize ?? 32;
      minCX = Math.floor(map.boundsMinX / chunkSize);
      maxCX = Math.floor(map.boundsMaxX / chunkSize);
      minCY = Math.floor(map.boundsMinY / chunkSize);
      maxCY = Math.floor(map.boundsMaxY / chunkSize);
    }

    // Generate chunks
    const chunks: Array<{ chunkX: number; chunkY: number; layerData: string }> = [];

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const layerData = generateChunkLayerData(cx, cy, genConfig);
        chunks.push({ chunkX: cx, chunkY: cy, layerData });
      }
    }

    // Batch upsert all chunks
    for (const chunk of chunks) {
      await db
        .insert(mapChunks)
        .values({ mapId, ...chunk })
        .onConflictDoUpdate({
          target: [mapChunks.mapId, mapChunks.chunkX, mapChunks.chunkY],
          set: {
            layerData: chunk.layerData,
            version: sql`${mapChunks.version} + 1`,
            updatedAt: new Date(),
          },
        });
    }

    // Update map status and chunk count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mapChunks)
      .where(eq(mapChunks.mapId, mapId));

    await db
      .update(maps)
      .set({
        status: 'ready',
        totalChunks: countResult.count,
        updatedAt: new Date(),
      })
      .where(eq(maps.id, mapId));

    const [result] = await db.select().from(maps).where(eq(maps.id, mapId));

    return NextResponse.json({
      message: `Generated ${chunks.length} chunks`,
      map: result,
      chunksGenerated: chunks.length,
    });
  } catch (error) {
    // Revert to draft on error
    await db
      .update(maps)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(maps.id, mapId));

    return NextResponse.json(
      { error: `Generation failed: ${error}` },
      { status: 500 }
    );
  }
}
