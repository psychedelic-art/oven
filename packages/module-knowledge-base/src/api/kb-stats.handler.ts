import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { kbEntries, kbCategories } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * GET /api/knowledge-base/[tenantSlug]/stats
 * Returns entry counts, category breakdown, and embedding coverage.
 */
export async function GET(
  _request: NextRequest,
  context?: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await context!.params;
  const db = getDb();

  // Resolve tenant
  const tenants = await db.execute(
    sql`SELECT id FROM tenants WHERE slug = ${tenantSlug} LIMIT 1`
  );
  const tenantRows = (tenants.rows ?? tenants) as Array<Record<string, unknown>>;
  if (tenantRows.length === 0) return notFound();

  const tenantId = Number(tenantRows[0].id);

  // Total entries
  const [{ count: totalEntries }] = await db
    .select({ count: sql`count(*)` })
    .from(kbEntries)
    .where(eq(kbEntries.tenantId, tenantId));

  // Enabled/disabled
  const [{ count: enabledEntries }] = await db
    .select({ count: sql`count(*)` })
    .from(kbEntries)
    .where(and(eq(kbEntries.tenantId, tenantId), eq(kbEntries.enabled, true)));

  // Embedding coverage via raw SQL (metadata->>'embeddingStatus')
  const embeddingStats = await db.execute(sql`
    SELECT
      COALESCE(metadata->>'embeddingStatus', 'none') AS status,
      COUNT(*) AS cnt
    FROM kb_entries
    WHERE tenant_id = ${tenantId}
    GROUP BY COALESCE(metadata->>'embeddingStatus', 'none')
  `);
  const embRows = (embeddingStats.rows ?? embeddingStats) as Array<Record<string, unknown>>;
  const embeddingCoverage: Record<string, number> = {};
  for (const row of embRows) {
    embeddingCoverage[row.status as string] = Number(row.cnt);
  }

  // Category breakdown
  const categoryBreakdown = await db.execute(sql`
    SELECT c.id AS "categoryId", c.name, COUNT(e.id) AS "entryCount"
    FROM kb_categories c
    LEFT JOIN kb_entries e ON e.category_id = c.id AND e.tenant_id = c.tenant_id
    WHERE c.tenant_id = ${tenantId}
    GROUP BY c.id, c.name
    ORDER BY c."order"
  `);
  const catRows = (categoryBreakdown.rows ?? categoryBreakdown) as Array<Record<string, unknown>>;

  // Language distribution
  const langDist = await db.execute(sql`
    SELECT language, COUNT(*) AS count
    FROM kb_entries
    WHERE tenant_id = ${tenantId}
    GROUP BY language
    ORDER BY count DESC
  `);
  const langRows = (langDist.rows ?? langDist) as Array<Record<string, unknown>>;

  const total = Number(totalEntries);
  const embedded = embeddingCoverage['embedded'] ?? 0;

  return NextResponse.json({
    totalEntries: total,
    enabledEntries: Number(enabledEntries),
    disabledEntries: total - Number(enabledEntries),
    embeddingCoverage: {
      ...embeddingCoverage,
      percentage: total > 0 ? Math.round((embedded / total) * 100 * 10) / 10 : 0,
    },
    categoryBreakdown: catRows.map((r) => ({
      categoryId: Number(r.categoryId),
      name: r.name,
      entryCount: Number(r.entryCount),
    })),
    languageDistribution: langRows.map((r) => ({
      language: r.language,
      count: Number(r.count),
    })),
  });
}
