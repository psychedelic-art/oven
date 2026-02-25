import { NextRequest, NextResponse } from 'next/server';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { rlsPolicyVersions } from '../schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const policyId = parseInt(id, 10);
  const listParams = parseListParams(request);

  const orderCol = (rlsPolicyVersions as any)[listParams.sort] ?? rlsPolicyVersions.version;
  const orderFn = listParams.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(rlsPolicyVersions)
      .where(eq(rlsPolicyVersions.policyId, policyId))
      .orderBy(orderFn)
      .limit(listParams.limit)
      .offset(listParams.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(rlsPolicyVersions)
      .where(eq(rlsPolicyVersions.policyId, policyId)),
  ]);

  return listResponse(data, 'rls-policy-versions', listParams, countResult[0].count);
}
