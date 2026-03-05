import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { formSubmissions } from '../schema';

// GET /api/form-submissions/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(formSubmissions)
    .where(eq(formSubmissions.id, parseInt(id, 10)));

  if (!result) return notFound('Form submission not found');
  return NextResponse.json(result);
}
