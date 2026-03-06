import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { uiFlows } from '../schema';
import { tenants } from '@oven/module-tenants/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const db = getDb();
  const { tenantSlug } = await params;

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

  return NextResponse.json({
    definition: flow.definition,
    theme: flow.themeConfig,
    domain: flow.domainConfig,
    tenantName: tenant.name,
  });
}
