import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, isNull } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { moduleConfigs } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol =
    (moduleConfigs as any)[params.sort] ?? moduleConfigs.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(moduleConfigs).orderBy(orderFn);

  if (params.filter.moduleName) {
    query = query.where(
      eq(moduleConfigs.moduleName, params.filter.moduleName as string)
    );
  }
  if (params.filter.scope) {
    query = query.where(
      eq(moduleConfigs.scope, params.filter.scope as string)
    );
  }
  if (params.filter.key) {
    query = query.where(
      eq(moduleConfigs.key, params.filter.key as string)
    );
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(moduleConfigs),
  ]);

  return listResponse(data, 'module-configs', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Upsert: if a config with same (moduleName, scope, scopeId, key) exists, update it
  const conditions = [
    eq(moduleConfigs.moduleName, body.moduleName),
    eq(moduleConfigs.scope, body.scope ?? 'module'),
    eq(moduleConfigs.key, body.key),
  ];

  if (body.scopeId) {
    conditions.push(eq(moduleConfigs.scopeId, body.scopeId));
  } else {
    conditions.push(isNull(moduleConfigs.scopeId));
  }

  const [existing] = await db
    .select()
    .from(moduleConfigs)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    const [result] = await db
      .update(moduleConfigs)
      .set({
        value: body.value,
        description: body.description !== undefined ? body.description : existing.description,
        updatedAt: new Date(),
      })
      .where(eq(moduleConfigs.id, existing.id))
      .returning();

    return NextResponse.json(result);
  }

  const [result] = await db
    .insert(moduleConfigs)
    .values({
      moduleName: body.moduleName,
      scope: body.scope ?? 'module',
      scopeId: body.scopeId ?? null,
      key: body.key,
      value: body.value,
      description: body.description ?? null,
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
