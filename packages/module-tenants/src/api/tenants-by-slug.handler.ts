import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { tenants } from '../schema';

// GET /api/tenants/by-slug/[slug] — Resolve tenant by slug
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const db = getDb();
  const { slug } = await params;
  const [result] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug));

  if (!result) return notFound('Tenant not found');
  return NextResponse.json(result);
}
