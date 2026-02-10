import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { worldConfigs } from '../schema';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const configId = parseInt(id, 10);

  // Verify config exists
  const [existing] = await db
    .select()
    .from(worldConfigs)
    .where(eq(worldConfigs.id, configId));

  if (!existing) return notFound('World config not found');

  // Deactivate all, then activate the target
  await db.update(worldConfigs).set({ isActive: false });
  const [result] = await db
    .update(worldConfigs)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(worldConfigs.id, configId))
    .returning();

  return NextResponse.json(result);
}
