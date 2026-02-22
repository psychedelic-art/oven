import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { rlsPolicies, rlsPolicyVersions } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (rlsPolicies as any)[params.sort] ?? rlsPolicies.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(rlsPolicies).orderBy(orderFn);

  if (params.filter.status) {
    query = query.where(eq(rlsPolicies.status, params.filter.status as string));
  }
  if (params.filter.targetTable) {
    query = query.where(eq(rlsPolicies.targetTable, params.filter.targetTable as string));
  }
  if (params.filter.roleId) {
    query = query.where(eq(rlsPolicies.roleId, params.filter.roleId as number));
  }
  if (params.filter.q) {
    query = query.where(ilike(rlsPolicies.name, `%${params.filter.q}%`));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(rlsPolicies),
  ]);

  return listResponse(data, 'rls-policies', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(rlsPolicies).values({
    ...body,
    definition: body.definition ?? { nodes: [], edges: [] },
    status: 'draft',
    version: 1,
  }).returning();

  // Create initial version snapshot
  await db.insert(rlsPolicyVersions).values({
    policyId: result.id,
    version: 1,
    definition: result.definition,
    description: 'Initial version',
  });

  return NextResponse.json(result, { status: 201 });
}
