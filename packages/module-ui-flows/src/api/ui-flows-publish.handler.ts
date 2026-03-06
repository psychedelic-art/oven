import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { uiFlows, uiFlowVersions } from '../schema';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const numId = parseInt(id, 10);

  const [flow] = await db.select().from(uiFlows).where(eq(uiFlows.id, numId));
  if (!flow) return notFound('UI Flow not found');

  if (flow.status === 'published') {
    return badRequest('UI Flow is already published. Update it first to create a new version.');
  }

  const newVersion = flow.version + 1;

  // Save current state as a version snapshot
  await db.insert(uiFlowVersions).values({
    uiFlowId: flow.id,
    version: newVersion,
    definition: flow.definition,
    themeConfig: flow.themeConfig,
    description: `Published version ${newVersion}`,
  });

  // Update flow status and version
  const [result] = await db
    .update(uiFlows)
    .set({
      status: 'published',
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(uiFlows.id, numId))
    .returning();

  const domain = (flow.domainConfig as any)?.customDomain
    || (flow.domainConfig as any)?.subdomain
    || flow.slug;

  eventBus.emit('ui-flows.flow.published', {
    id: result.id,
    tenantId: result.tenantId,
    slug: result.slug,
    version: newVersion,
    domain,
  });

  return NextResponse.json(result);
}
