import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry/event-bus';
import { workflows, workflowVersions } from '../schema';

/**
 * GET /api/workflows/[id]/versions/[versionId]
 * Get a specific version snapshot.
 */
export async function GET(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id, versionId } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  const numVersionId = parseInt(versionId, 10);
  if (isNaN(numId)) return notFound('Invalid workflow ID');
  if (isNaN(numVersionId)) return notFound('Invalid version ID');

  const [row] = await db
    .select()
    .from(workflowVersions)
    .where(
      and(
        eq(workflowVersions.workflowId, numId),
        eq(workflowVersions.id, numVersionId)
      )
    )
    .limit(1);

  if (!row) return notFound('Version not found');
  return NextResponse.json(row);
}
