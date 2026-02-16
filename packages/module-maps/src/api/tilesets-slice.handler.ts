import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { withHandler } from '@oven/module-registry/api-errors';
import { tilesets, tileDefinitions } from '../schema';

/**
 * POST /api/tilesets/[id]/slice
 *
 * Spritesheet slicing — creates tile definitions for each cell in the grid,
 * then crops each tile from the spritesheet using sharp and uploads to Vercel Blob.
 * Each tile gets its own unique spritePath (individual cropped image).
 *
 * Body: { startTileId, columns, rows, categoryPrefix?, flagsDefault? }
 */
export const POST = withHandler(async (
  request: NextRequest,
  ctx?: { params: Promise<Record<string, string>> }
) => {
  const db = getDb();
  const { id } = await ctx!.params;
  const tilesetId = parseInt(id, 10);

  // Fetch tileset
  const [tileset] = await db
    .select()
    .from(tilesets)
    .where(eq(tilesets.id, tilesetId));

  if (!tileset) return notFound('Tileset not found');

  const body = await request.json();
  const {
    startTileId,
    columns,
    rows,
    categoryPrefix = 'terrain',
    flagsDefault = 1, // Walkable bit (bit 0) — terrain tiles walkable by default
  } = body;

  if (!startTileId || !columns || !rows) {
    return NextResponse.json(
      { error: 'startTileId, columns, and rows are required' },
      { status: 400 }
    );
  }

  if (!tileset.imagePath) {
    return NextResponse.json(
      { error: 'Tileset has no spritesheet uploaded. Upload an image first.' },
      { status: 400 }
    );
  }

  // Pre-flight: check for existing tileIds in the range
  const endTileId = startTileId + columns * rows - 1;
  const existingIds = await db
    .select({ tileId: tileDefinitions.tileId })
    .from(tileDefinitions)
    .where(
      and(
        gte(tileDefinitions.tileId, startTileId),
        lte(tileDefinitions.tileId, endTileId)
      )
    );

  if (existingIds.length > 0) {
    const ids = existingIds.map((r) => r.tileId).join(', ');
    return NextResponse.json(
      {
        error: `Tile IDs already exist: ${ids}. Choose a different start ID or delete existing tiles first.`,
      },
      { status: 409 }
    );
  }

  // Build tile definition records (spritePath will be updated after cropping)
  const tilesToCreate = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      tilesToCreate.push({
        tileId: startTileId + (row * columns + col),
        name: `${tileset.name}_r${row}_c${col}`,
        tilesetId,
        spriteX: col,
        spriteY: row,
        spritePath: tileset.imagePath, // Temporary — updated below after cropping
        colorHex: '#888888FF',
        category: categoryPrefix,
        flags: flagsDefault,
      });
    }
  }

  // Insert all tiles
  const created = await db
    .insert(tileDefinitions)
    .values(tilesToCreate)
    .returning();

  // Dynamically import sharp and @vercel/blob (avoids webpack bundling issues)
  const [{ default: sharp }, { put }] = await Promise.all([
    import('sharp'),
    import('@vercel/blob'),
  ]);

  // Download the spritesheet once for cropping
  const sheetResponse = await fetch(tileset.imagePath);
  const sheetBuffer = Buffer.from(await sheetResponse.arrayBuffer());

  // Auto-detect tile dimensions from actual image size + grid
  const metadata = await sharp(sheetBuffer).metadata();
  const sheetWidth = metadata.width!;
  const sheetHeight = metadata.height!;
  const actualTileW = Math.floor(sheetWidth / columns);
  const actualTileH = Math.floor(sheetHeight / rows);

  // Update tileset dimensions if they differ (auto-correct from image)
  if (actualTileW !== tileset.tileWidth || actualTileH !== tileset.tileHeight) {
    await db.update(tilesets)
      .set({ tileWidth: actualTileW, tileHeight: actualTileH, updatedAt: new Date() })
      .where(eq(tilesets.id, tilesetId));
  }

  // Crop each tile and upload individually, then update spritePath
  const cropPromises = created.map(async (tile) => {
    if (tile.spriteX == null || tile.spriteY == null) return;

    const cropped = await sharp(sheetBuffer)
      .extract({
        left: tile.spriteX * actualTileW,
        top: tile.spriteY * actualTileH,
        width: actualTileW,
        height: actualTileH,
      })
      .png()
      .toBuffer();

    const blob = await put(
      `tilesets/${tilesetId}/tiles/r${tile.spriteY}_c${tile.spriteX}.png`,
      cropped,
      { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN }
    );

    // Update tile's spritePath to the individual crop
    await db
      .update(tileDefinitions)
      .set({ spritePath: blob.url })
      .where(eq(tileDefinitions.id, tile.id));

    return blob.url;
  });

  await Promise.all(cropPromises);

  // Update tileset with grid dimensions
  const [updatedTileset] = await db
    .update(tilesets)
    .set({ columns, rows, updatedAt: new Date() })
    .where(eq(tilesets.id, tilesetId))
    .returning();

  return NextResponse.json(
    { tileset: updatedTileset, tilesCreated: created.length },
    { status: 201 }
  );
});
