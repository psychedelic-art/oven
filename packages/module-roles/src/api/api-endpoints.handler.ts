import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { registry } from '@oven/module-registry';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { apiEndpointPermissions, permissions } from '../schema';

/**
 * GET /api/api-endpoints
 * Discovers all API endpoints from the module registry and merges with
 * permission assignments from the database.
 */
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  // 1. Scan all registered modules for their API handlers
  const allModules = registry.getAll();
  const discoveredEndpoints: Array<{ module: string; route: string; method: string }> = [];

  for (const mod of allModules) {
    for (const [route, handlers] of Object.entries(mod.apiHandlers)) {
      for (const method of Object.keys(handlers)) {
        discoveredEndpoints.push({
          module: mod.name,
          route,
          method: method.toUpperCase(),
        });
      }
    }
  }

  // 2. Fetch all existing permission assignments from DB
  const assignments = await db
    .select({
      id: apiEndpointPermissions.id,
      module: apiEndpointPermissions.module,
      route: apiEndpointPermissions.route,
      method: apiEndpointPermissions.method,
      permissionId: apiEndpointPermissions.permissionId,
      permissionSlug: permissions.slug,
      isPublic: apiEndpointPermissions.isPublic,
    })
    .from(apiEndpointPermissions)
    .leftJoin(permissions, eq(apiEndpointPermissions.permissionId, permissions.id));

  // 3. Build assignment lookup
  const assignmentMap = new Map<string, (typeof assignments)[number]>();
  for (const a of assignments) {
    assignmentMap.set(`${a.module}:${a.route}:${a.method}`, a);
  }

  // 4. Merge discovered endpoints with assignments
  const merged = discoveredEndpoints.map((ep) => {
    const key = `${ep.module}:${ep.route}:${ep.method}`;
    const assignment = assignmentMap.get(key);
    return {
      ...ep,
      id: assignment?.id ?? null,
      permissionId: assignment?.permissionId ?? null,
      permissionSlug: assignment?.permissionSlug ?? null,
      isPublic: assignment?.isPublic ?? false,
    };
  });

  // Apply filter
  let filtered = merged;
  if (params.filter.module) {
    filtered = filtered.filter((ep) => ep.module === params.filter.module);
  }
  if (params.filter.q) {
    const q = (params.filter.q as string).toLowerCase();
    filtered = filtered.filter(
      (ep) => ep.route.toLowerCase().includes(q) || ep.module.toLowerCase().includes(q)
    );
  }

  // Apply pagination
  const total = filtered.length;
  const data = filtered.slice(params.offset, params.offset + params.limit);

  return listResponse(data, 'api-endpoints', params, total);
}
