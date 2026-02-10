import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { players } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(players)
    .where(eq(players.id, parseInt(id, 10)));

  if (!result) return notFound('Player not found');
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  const [result] = await db
    .update(players)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(players.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Player not found');
  return NextResponse.json(result);
}
