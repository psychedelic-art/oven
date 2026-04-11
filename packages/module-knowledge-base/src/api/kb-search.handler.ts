import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { badRequest, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { hybridSearch } from '../engine/search-engine';
import { sql } from 'drizzle-orm';

/**
 * POST /api/knowledge-base/[tenantSlug]/search
 * PUBLIC endpoint — no authentication required.
 * Resolves tenant from URL slug and performs hybrid search.
 */
export async function POST(
  request: NextRequest,
  context?: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await context!.params;
  const body = await request.json();
  const db = getDb();

  // Validate input
  const { query, language, categorySlug, maxResults, knowledgeBaseId } = body;
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return badRequest('Missing or empty "query" field');
  }

  if (query.length > 500) {
    return badRequest('Query exceeds maximum length of 500 characters');
  }

  // Resolve tenant from slug
  const tenants = await db.execute(
    sql`SELECT id, enabled FROM tenants WHERE slug = ${tenantSlug} LIMIT 1`
  );
  const tenantRows = (tenants.rows ?? tenants) as Array<Record<string, unknown>>;
  if (tenantRows.length === 0) return notFound();

  const tenant = tenantRows[0];
  if (!tenant.enabled) return notFound();

  const tenantId = Number(tenant.id);

  // Run hybrid search
  const result = await hybridSearch({
    query: query.trim(),
    tenantId,
    knowledgeBaseId: knowledgeBaseId ? Number(knowledgeBaseId) : undefined,
    language,
    categorySlug,
    maxResults: maxResults ? Math.min(Number(maxResults), 20) : undefined,
  });

  return NextResponse.json(result);
}
