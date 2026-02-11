import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry/event-bus';
import { workflows, workflowVersions } from '../schema';

/**
 * POST /api/workflows/[id]/versions/[versionId]/restore
 * Restore a workflow to a previous version:
 *   1. Save current definition as a new version snapshot
 *   2. Update workflow.definition = versionSnapshot.definition
 *   3. Increment workflow.version
 */
export async function POST(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id, versionId } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  const numVersionId = parseInt(versionId, 10);
  if (isNaN(numId)) return notFound('Invalid workflow ID');
  if (isNaN(numVersionId)) return notFound('Invalid version ID');

  // Load current workflow
  const [current] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, numId))
    .limit(1);
  if (!current) return notFound('Workflow not found');

  // Load the version to restore
  const [versionSnapshot] = await db
    .select()
    .from(workflowVersions)
    .where(
      and(
        eq(workflowVersions.workflowId, numId),
        eq(workflowVersions.id, numVersionId)
      )
    )
    .limit(1);
  if (!versionSnapshot) return notFound('Version not found');

  // Save current definition as a version snapshot before overwriting
  await db.insert(workflowVersions).values({
    workflowId: numId,
    version: current.version,
    definition: current.definition,
    description: `Auto-saved before restore to v${versionSnapshot.version}`,
  });

  // Restore the old definition and increment version
  const newVersion = current.version + 1;
  const [result] = await db
    .update(workflows)
    .set({
      definition: versionSnapshot.definition,
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, numId))
    .returning();

  await eventBus.emit('workflows.workflow.updated', {
    id: result.id,
    name: result.name,
    version: newVersion,
    restoredFromVersion: versionSnapshot.version,
  });

  return NextResponse.json(result);
}
