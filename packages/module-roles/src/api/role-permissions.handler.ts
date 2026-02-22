import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { rolePermissions, permissions } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (rolePermissions as any)[params.sort] ?? rolePermissions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  // Join with permissions to include slug/resource/action
  let baseQuery = db
    .select({
      id: rolePermissions.id,
      roleId: rolePermissions.roleId,
      permissionId: rolePermissions.permissionId,
      permissionSlug: permissions.slug,
      permissionResource: permissions.resource,
      permissionAction: permissions.action,
      createdAt: rolePermissions.createdAt,
    })
    .from(rolePermissions)
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .orderBy(orderFn);

  if (params.filter.roleId) {
    baseQuery = baseQuery.where(eq(rolePermissions.roleId, params.filter.roleId as number));
  }

  const [data, countResult] = await Promise.all([
    baseQuery.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(rolePermissions),
  ]);

  return listResponse(data, 'role-permissions', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Support bulk assignment: { roleId, permissionIds: [1, 2, 3] }
  if (Array.isArray(body.permissionIds)) {
    const values = body.permissionIds.map((permissionId: number) => ({
      roleId: body.roleId,
      permissionId,
    }));

    const results = [];
    for (const val of values) {
      const [result] = await db
        .insert(rolePermissions)
        .values(val)
        .onConflictDoNothing()
        .returning();
      if (result) results.push(result);
    }
    return NextResponse.json(results, { status: 201 });
  }

  const [result] = await db.insert(rolePermissions).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}
