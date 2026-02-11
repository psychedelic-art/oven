import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { workflowExecutions } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol =
    (workflowExecutions as any)[params.sort] ?? workflowExecutions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(workflowExecutions).orderBy(orderFn);

  if (params.filter.workflowId) {
    query = query.where(
      eq(workflowExecutions.workflowId, params.filter.workflowId as number)
    );
  }
  if (params.filter.status) {
    query = query.where(
      eq(workflowExecutions.status, params.filter.status as string)
    );
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(workflowExecutions),
  ]);

  return listResponse(
    data,
    'workflow-executions',
    params,
    countResult[0].count
  );
}
