import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { uiFlows, uiFlowPages } from '../schema';
import { tenants } from '@oven/module-tenants/schema';
import { urlSegmentToPageSlug } from '../slug-utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; pageSlug: string }> }
) {
  const db = getDb();
  const { tenantSlug, pageSlug: rawSlug } = await params;
  const pageSlug = urlSegmentToPageSlug(rawSlug);

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

  const [page] = await db.select().from(uiFlowPages)
    .where(and(
      eq(uiFlowPages.uiFlowId, flow.id),
      eq(uiFlowPages.slug, pageSlug),
      eq(uiFlowPages.enabled, true),
    ))
    .limit(1);

  if (!page) return notFound('Page not found');

  // Find the page definition from the flow's definition JSONB
  const definition = flow.definition as any;
  const pageDef = definition?.pages?.find((p: any) => p.slug === pageSlug);

  return NextResponse.json({
    page: {
      ...page,
      definition: pageDef ?? null,
    },
    theme: flow.themeConfig,
    tenantName: tenant.name,
  });
}
