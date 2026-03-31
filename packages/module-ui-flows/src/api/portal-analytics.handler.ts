import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { uiFlows, uiFlowAnalytics } from '../schema';
import { tenants } from '@oven/module-tenants/schema';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const db = getDb();
  const { tenantSlug } = await params;
  const body = await request.json();

  const { pageSlug, eventType, visitorId, metadata } = body;

  if (!pageSlug || !eventType) {
    return badRequest('pageSlug and eventType are required');
  }

  const [tenant] = await db.select().from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) return notFound('Tenant not found');

  const [flow] = await db.select().from(uiFlows)
    .where(and(
      eq(uiFlows.tenantId, tenant.id),
      eq(uiFlows.status, 'published'),
      eq(uiFlows.enabled, true),
    ))
    .limit(1);

  if (!flow) return notFound('No published portal found for this tenant');

  const [result] = await db.insert(uiFlowAnalytics).values({
    uiFlowId: flow.id,
    tenantId: tenant.id,
    pageSlug,
    eventType,
    visitorId: visitorId ?? null,
    metadata: metadata ?? null,
  }).returning();

  if (eventType === 'page_view') {
    eventBus.emit('ui-flows.page.visited', {
      uiFlowId: flow.id,
      tenantId: tenant.id,
      pageSlug,
      visitorId: visitorId ?? null,
      metadata: metadata ?? null,
    });
  } else if (eventType === 'form_submit') {
    eventBus.emit('ui-flows.form.submitted', {
      uiFlowId: flow.id,
      tenantId: tenant.id,
      pageSlug,
      formId: metadata?.formId ?? null,
      submissionId: metadata?.submissionId ?? null,
    });
  }

  return NextResponse.json(result, { status: 201 });
}
