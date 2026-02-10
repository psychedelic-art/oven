import '@/lib/modules';
import '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { tileDefinitions } from '@oven/module-maps/schema';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const tileId = formData.get('tileId') as string | null;

  if (!file || !tileId) {
    return NextResponse.json(
      { error: 'file and tileId are required' },
      { status: 400 }
    );
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'Only image files are allowed' },
      { status: 400 }
    );
  }

  // Validate file size (max 2MB for tile sprites)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large (max 2MB)' },
      { status: 400 }
    );
  }

  // Upload to Vercel Blob
  const blob = await put(
    `tiles/${tileId}/${file.name}`,
    file,
    {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }
  );

  // Update tile definition with sprite path
  const db = getDb();
  const [updated] = await db
    .update(tileDefinitions)
    .set({ spritePath: blob.url, updatedAt: new Date() })
    .where(eq(tileDefinitions.tileId, parseInt(tileId, 10)))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: `Tile with tileId ${tileId} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({ url: blob.url, tile: updated });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  const { tileId } = body;

  if (!tileId) {
    return NextResponse.json(
      { error: 'tileId is required' },
      { status: 400 }
    );
  }

  const db = getDb();

  // Get current sprite path
  const [tile] = await db
    .select()
    .from(tileDefinitions)
    .where(eq(tileDefinitions.tileId, parseInt(tileId, 10)));

  if (!tile?.spritePath) {
    return NextResponse.json(
      { error: 'No sprite to delete' },
      { status: 404 }
    );
  }

  // Delete from Vercel Blob
  try {
    await del(tile.spritePath, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (e) {
    console.warn('Failed to delete blob, continuing:', e);
  }

  // Clear sprite path in DB
  const [updated] = await db
    .update(tileDefinitions)
    .set({ spritePath: null, updatedAt: new Date() })
    .where(eq(tileDefinitions.tileId, parseInt(tileId, 10)))
    .returning();

  return NextResponse.json({ tile: updated });
}
