import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike, isNull } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { moduleConfigs } from '../schema';

// GET /api/module-configs — List config entries with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (moduleConfigs as any)[params.sort] ?? moduleConfigs.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(moduleConfigs).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.moduleName) {
    conditions.push(eq(moduleConfigs.moduleName, params.filter.moduleName as string));
  }
  if (params.filter.scope) {
    conditions.push(eq(moduleConfigs.scope, params.filter.scope as string));
  }
  if (params.filter.key) {
    conditions.push(eq(moduleConfigs.key, params.filter.key as string));
  }
  if (params.filter.tenantId) {
    conditions.push(eq(moduleConfigs.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.q) {
    conditions.push(ilike(moduleConfigs.key, `%${params.filter.q}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(moduleConfigs);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'module-configs', params, countResult[0].count);
}

// POST /api/module-configs — Upsert a config entry
export async function POST(request: NextRequest) {
  const db = getDb();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { tenantId, moduleName, scope, scopeId, key, value, description } = body;

  // Check for existing entry with same tuple
  const existingConditions = [
    eq(moduleConfigs.moduleName, moduleName),
    eq(moduleConfigs.scope, scope || 'module'),
    eq(moduleConfigs.key, key),
  ];

  if (tenantId != null) {
    existingConditions.push(eq(moduleConfigs.tenantId, tenantId));
  } else {
    existingConditions.push(isNull(moduleConfigs.tenantId));
  }

  if (scopeId != null) {
    existingConditions.push(eq(moduleConfigs.scopeId, scopeId));
  } else {
    existingConditions.push(isNull(moduleConfigs.scopeId));
  }

  const [existing] = await db
    .select()
    .from(moduleConfigs)
    .where(and(...existingConditions))
    .limit(1);

  if (existing) {
    // Update existing entry
    const oldValue = existing.value;
    const [result] = await db
      .update(moduleConfigs)
      .set({ value, description, updatedAt: new Date() })
      .where(eq(moduleConfigs.id, existing.id))
      .returning();

    eventBus.emit('config.entry.updated', {
      id: result.id,
      tenantId: result.tenantId,
      moduleName: result.moduleName,
      key: result.key,
      oldValue,
      newValue: value,
    });

    return NextResponse.json(result);
  }

  // Create new entry
  const [result] = await db
    .insert(moduleConfigs)
    .values({
      tenantId: tenantId ?? null,
      moduleName,
      scope: scope || 'module',
      scopeId: scopeId ?? null,
      key,
      value,
      description,
    })
    .returning();

  eventBus.emit('config.entry.created', {
    id: result.id,
    tenantId: result.tenantId,
    moduleName: result.moduleName,
    key: result.key,
    scope: result.scope,
    scopeId: result.scopeId,
  });

  return NextResponse.json(result, { status: 201 });
}
