import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { uiFlows, uiFlowVersions } from '../schema';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const db = getDb();
  const { id, versionId } = await params;
  const numId = parseInt(id, 10);
  const numVersionId = parseInt(versionId, 10);

  const [version] = await db.select().from(uiFlowVersions)
    .where(and(
      eq(uiFlowVersions.uiFlowId, numId),
      eq(uiFlowVersions.id, numVersionId),
    ));

  if (!version) return notFound('Version not found');

  const [result] = await db
    .update(uiFlows)
    .set({
      definition: version.definition,
      themeConfig: version.themeConfig,
      status: 'draft',
      updatedAt: new Date(),
    })
    .where(eq(uiFlows.id, numId))
    .returning();

  if (!result) return notFound('UI Flow not found');

  eventBus.emit('ui-flows.flow.updated', {
    id: result.id,
    tenantId: result.tenantId,
    name: result.name,
    version: result.version,
  });

  return NextResponse.json(result);
}
