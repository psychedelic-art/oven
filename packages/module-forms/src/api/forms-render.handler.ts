import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { forms } from '../schema';

// GET /api/forms/[id]/render — Fetch published form for rendering
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [result] = await db
    .select()
    .from(forms)
    .where(eq(forms.id, parseInt(id, 10)));

  if (!result) return notFound('Form not found');

  if (result.status !== 'published') {
    return NextResponse.json(
      { error: 'Form is not published' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    id: result.id,
    name: result.name,
    slug: result.slug,
    version: result.version,
    definition: result.definition,
    dataLayerConfig: result.dataLayerConfig,
    businessLayerConfig: result.businessLayerConfig,
  });
}
