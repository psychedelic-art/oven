import '@/lib/modules';
import '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { tilesets } from '@oven/module-maps/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tilesetId = parseInt(id, 10);

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json(
      { error: 'file is required' },
      { status: 400 }
    );
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json(
      { error: 'Only image files are allowed' },
      { status: 400 }
    );
  }

  // Allow larger files for spritesheets (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File too large (max 10MB)' },
      { status: 400 }
    );
  }

  const blob = await put(
    `tilesets/${tilesetId}/${file.name}`,
    file,
    {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }
  );

  const db = getDb();
  const [updated] = await db
    .update(tilesets)
    .set({ imagePath: blob.url, updatedAt: new Date() })
    .where(eq(tilesets.id, tilesetId))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: `Tileset with id ${tilesetId} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({ url: blob.url, tileset: updated });
}
