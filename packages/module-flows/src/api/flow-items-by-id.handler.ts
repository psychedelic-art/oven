import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { flowItems } from '../schema';

// GET /api/flow-items/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(flowItems)
    .where(eq(flowItems.id, parseInt(id, 10)));

  if (!result) return notFound('Flow item not found');
  return NextResponse.json(result);
}

// PUT /api/flow-items/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(flowItems)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(flowItems.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Flow item not found');

  return NextResponse.json(result);
}
