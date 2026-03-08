import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { registry } from '@oven/module-registry';
import { workflows } from '@oven/module-workflows/schema';

/**
 * GET /api/form-discovery?type=workflows|endpoints
 *
 * Lightweight discovery endpoint for the form editor's trait panel.
 * Returns available workflows or API endpoints that can be bound
 * to component data source / action traits.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  if (type === 'workflows') {
    return discoverWorkflows();
  }

  if (type === 'endpoints') {
    return discoverEndpoints();
  }

  return NextResponse.json(
    { error: 'Missing or invalid "type" param. Use ?type=workflows or ?type=endpoints' },
    { status: 400 },
  );
}

/** Fetch all enabled workflows (id, name, slug) for the workflow dropdown */
async function discoverWorkflows() {
  const db = getDb();

  const rows = await db
    .select({
      id: workflows.id,
      name: workflows.name,
      slug: workflows.slug,
    })
    .from(workflows)
    .where(eq(workflows.enabled, true))
    .orderBy(asc(workflows.name));

  return NextResponse.json(rows);
}

/** Scan the module registry for all API endpoints */
async function discoverEndpoints() {
  const allModules = registry.getAll();
  const endpoints: Array<{ module: string; route: string; method: string }> = [];

  for (const mod of allModules) {
    for (const [route, handlers] of Object.entries(mod.apiHandlers)) {
      for (const method of Object.keys(handlers)) {
        endpoints.push({
          module: mod.name,
          route,
          method: method.toUpperCase(),
        });
      }
    }
  }

  // Sort by module → route → method for consistent ordering
  endpoints.sort((a, b) =>
    `${a.module}/${a.route}/${a.method}`.localeCompare(`${b.module}/${b.route}/${b.method}`),
  );

  return NextResponse.json(endpoints);
}
