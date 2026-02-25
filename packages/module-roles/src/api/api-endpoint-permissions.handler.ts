import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, asc, desc } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { apiEndpointPermissions, permissions } from '../schema';

/**
 * GET /api/api-endpoint-permissions
 * Lists all endpoint-permission mappings.
 */
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (apiEndpointPermissions as any)[params.sort] ?? apiEndpointPermissions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const [data, countResult] = await Promise.all([
    db
      .select({
        id: apiEndpointPermissions.id,
        module: apiEndpointPermissions.module,
        route: apiEndpointPermissions.route,
        method: apiEndpointPermissions.method,
        permissionId: apiEndpointPermissions.permissionId,
        permissionSlug: permissions.slug,
        isPublic: apiEndpointPermissions.isPublic,
        createdAt: apiEndpointPermissions.createdAt,
        updatedAt: apiEndpointPermissions.updatedAt,
      })
      .from(apiEndpointPermissions)
      .leftJoin(permissions, eq(apiEndpointPermissions.permissionId, permissions.id))
      .orderBy(orderFn)
      .limit(params.limit)
      .offset(params.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiEndpointPermissions),
  ]);

  return listResponse(data, 'api-endpoint-permissions', params, countResult[0].count);
}

/**
 * PUT /api/api-endpoint-permissions
 * Upsert endpoint-permission mappings.
 * Body: { module, route, method, permissionId?, isPublic? }
 */
export async function PUT(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { module: mod, route, method, permissionId, isPublic } = body;

  if (!mod || !route || !method) {
    return NextResponse.json(
      { error: 'module, route, and method are required' },
      { status: 400 }
    );
  }

  // Upsert: update if exists, insert if not
  const existing = await db
    .select()
    .from(apiEndpointPermissions)
    .where(
      and(
        eq(apiEndpointPermissions.module, mod),
        eq(apiEndpointPermissions.route, route),
        eq(apiEndpointPermissions.method, method.toUpperCase())
      )
    );

  let result;
  if (existing.length > 0) {
    [result] = await db
      .update(apiEndpointPermissions)
      .set({
        permissionId: permissionId ?? null,
        isPublic: isPublic ?? false,
        updatedAt: new Date(),
      })
      .where(eq(apiEndpointPermissions.id, existing[0].id))
      .returning();
  } else {
    [result] = await db
      .insert(apiEndpointPermissions)
      .values({
        module: mod,
        route,
        method: method.toUpperCase(),
        permissionId: permissionId ?? null,
        isPublic: isPublic ?? false,
      })
      .returning();
  }

  return NextResponse.json(result);
}
