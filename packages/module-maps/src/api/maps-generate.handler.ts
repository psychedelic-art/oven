import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { maps } from '../schema';

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

  // TODO: Trigger actual chunk generation (async job or inline for small maps)
  // For now, mark as ready immediately — generation logic will be added
  // when we connect the Unity procedural generation to the server
  await db
    .update(maps)
    .set({ status: 'ready', updatedAt: new Date() })
    .where(eq(maps.id, mapId));

  const [result] = await db.select().from(maps).where(eq(maps.id, mapId));

  return NextResponse.json({
    message: 'Map generation triggered',
    map: result,
  });
}
