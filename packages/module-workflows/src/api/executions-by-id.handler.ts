import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { workflowExecutions, nodeExecutions } from '../schema';

export async function GET(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid execution ID');

  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, numId))
    .limit(1);

  if (!execution) return notFound('Execution not found');

  // Also fetch all node executions for this run
  const nodes = await db
    .select()
    .from(nodeExecutions)
    .where(eq(nodeExecutions.executionId, numId));

  return NextResponse.json({
    ...execution,
    nodes,
  });
}
