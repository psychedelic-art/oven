import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, asc, count } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { workflows, workflowVersions } from '../schema';

/**
 * GET /api/workflows/[id]/versions
 * List version history for a workflow.
 * Supports ra-data-simple-rest sort/range params.
 */
export async function GET(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid workflow ID');

  // Parse React Admin query params
  const url = new URL(request.url);
  const sortParam = url.searchParams.get('sort');
  const rangeParam = url.searchParams.get('range');

  let sortField = 'version';
  let sortOrder: 'ASC' | 'DESC' = 'DESC';
  if (sortParam) {
    try {
      const [field, order] = JSON.parse(sortParam);
      sortField = field;
      sortOrder = order;
    } catch { /* use defaults */ }
  }

  let offset = 0;
  let limit = 25;
  if (rangeParam) {
    try {
      const [start, end] = JSON.parse(rangeParam);
      offset = start;
      limit = end - start + 1;
    } catch { /* use defaults */ }
  }

  // Get sort column
  const sortCol = sortField === 'createdAt' ? workflowVersions.createdAt
    : sortField === 'id' ? workflowVersions.id
    : workflowVersions.version;
  const orderFn = sortOrder === 'ASC' ? asc : desc;

  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, numId))
      .orderBy(orderFn(sortCol))
      .offset(offset)
      .limit(limit),
    db
      .select({ total: count() })
      .from(workflowVersions)
      .where(eq(workflowVersions.workflowId, numId)),
  ]);

  const end = Math.min(offset + data.length - 1, Number(total) - 1);

  return NextResponse.json(data, {
    headers: {
      'Content-Range': `workflow-versions ${offset}-${end}/${total}`,
      'Access-Control-Expose-Headers': 'Content-Range',
    },
  });
}
