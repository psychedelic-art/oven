import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { aiPlaygroundExecutions } from '../schema';

// GET /api/ai-playground-executions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(aiPlaygroundExecutions)
    .where(eq(aiPlaygroundExecutions.id, parseInt(id, 10)));

  if (!result) return notFound('Playground execution not found');
  return NextResponse.json(result);
}

// DELETE /api/ai-playground-executions/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(aiPlaygroundExecutions)
    .where(eq(aiPlaygroundExecutions.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Playground execution not found');

  return NextResponse.json(deleted);
}
