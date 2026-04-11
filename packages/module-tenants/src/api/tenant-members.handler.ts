import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, isNull, inArray } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { eventBus, registry } from '@oven/module-registry';
import { moduleConfigs } from '@oven/module-config/schema';
import { tenantMembers } from '../schema';
import { getOrderColumn } from './_utils/sort';
import { checkMemberLimit } from './_utils/member-guards';

// Whitelisted sort columns for GET /api/tenant-members (DRIFT-5).
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'userId',
  'role',
  'createdAt',
  'updatedAt',
] as const;

// GET /api/tenant-members — List tenant members with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(tenantMembers, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

  let query = db.select().from(tenantMembers).orderBy(orderFn);

  if (params.filter.tenantId) {
    query = query.where(eq(tenantMembers.tenantId, parseInt(params.filter.tenantId as string, 10))) as any;
  }

  const countCondition = params.filter.tenantId
    ? eq(tenantMembers.tenantId, parseInt(params.filter.tenantId as string, 10))
    : undefined;

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(tenantMembers).where(countCondition),
  ]);

  return listResponse(data, 'tenant-members', params, countResult[0].count);
}

// POST /api/tenant-members — Add a member to a tenant
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const tenantId =
    typeof body?.tenantId === 'number'
      ? body.tenantId
      : parseInt(String(body?.tenantId ?? ''), 10);
  if (!Number.isFinite(tenantId) || tenantId <= 0) {
    return badRequest('tenantId is required');
  }

  // DRIFT-4: resolve tenants.MAX_MEMBERS_PER_TENANT (tenant override →
  // platform default → configSchema default) and refuse the insert
  // when the tenant already has `maxMembers` rows. Direct DB reads
  // match the pattern used by `tenants-public.handler.ts` so we do
  // not introduce a handler-to-HTTP loop inside the same process.
  const [tenantRow] = await db
    .select()
    .from(moduleConfigs)
    .where(
      and(
        eq(moduleConfigs.tenantId, tenantId),
        eq(moduleConfigs.moduleName, 'tenants'),
        eq(moduleConfigs.scope, 'module'),
        isNull(moduleConfigs.scopeId),
        inArray(moduleConfigs.key, ['MAX_MEMBERS_PER_TENANT']),
      ),
    )
    .limit(1);

  let maxMembers: number;
  if (tenantRow) {
    maxMembers = Number(tenantRow.value);
  } else {
    const [platformRow] = await db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          isNull(moduleConfigs.tenantId),
          eq(moduleConfigs.moduleName, 'tenants'),
          eq(moduleConfigs.scope, 'module'),
          isNull(moduleConfigs.scopeId),
          inArray(moduleConfigs.key, ['MAX_MEMBERS_PER_TENANT']),
        ),
      )
      .limit(1);
    if (platformRow) {
      maxMembers = Number(platformRow.value);
    } else {
      const mod = registry.getModule('tenants');
      const schemaEntry = mod?.configSchema?.find(
        (e: { key: string }) => e.key === 'MAX_MEMBERS_PER_TENANT',
      );
      maxMembers = Number(schemaEntry?.defaultValue ?? 50);
    }
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId));

  const limitVerdict = checkMemberLimit(countRow.count, maxMembers);
  if (!limitVerdict.ok) {
    return NextResponse.json(
      { error: limitVerdict.message, limit: limitVerdict.limit },
      { status: 409 },
    );
  }

  const [result] = await db.insert(tenantMembers).values(body).returning();

  eventBus.emit('tenants.member.added', {
    tenantId: result.tenantId,
    userId: result.userId,
    role: result.role,
  });

  return NextResponse.json(result, { status: 201 });
}
