import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { badRequest, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { bulkEmbed } from '../engine/embedding-pipeline';
import { sql } from 'drizzle-orm';

/**
 * POST /api/knowledge-base/[tenantSlug]/ingest
 * Triggers bulk re-embedding of all entries for a tenant.
 */
export async function POST(
  request: NextRequest,
  context?: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await context!.params;
  const body = await request.json().catch(() => ({}));
  const db = getDb();

  // Resolve tenant from slug
  const tenants = await db.execute(
    sql`SELECT id FROM tenants WHERE slug = ${tenantSlug} LIMIT 1`
  );
  const tenantRows = (tenants.rows ?? tenants) as Array<Record<string, unknown>>;
  if (tenantRows.length === 0) return notFound();

  const tenantId = Number(tenantRows[0].id);

  const result = await bulkEmbed({
    tenantId,
    knowledgeBaseId: body.knowledgeBaseId ? Number(body.knowledgeBaseId) : undefined,
    categoryId: body.filter?.categoryId ? Number(body.filter.categoryId) : undefined,
    force: body.force ?? false,
  });

  return NextResponse.json(result, { status: 202 });
}
