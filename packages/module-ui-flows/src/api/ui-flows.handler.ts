import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { uiFlows, uiFlowPages } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (uiFlows as any)[params.sort] ?? uiFlows.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(uiFlows.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.status) {
    conditions.push(eq(uiFlows.status, params.filter.status as string));
  }
  if (params.filter.enabled !== undefined) {
    const enabledVal = params.filter.enabled === 'true' || params.filter.enabled === true;
    conditions.push(eq(uiFlows.enabled, enabledVal as boolean));
  }
  if (params.filter.q) {
    conditions.push(ilike(uiFlows.name, `%${params.filter.q}%`));
  }

  let query = db.select().from(uiFlows).orderBy(orderFn);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(uiFlows);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'ui-flows', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { tenantId, name, slug, description, definition, themeConfig, domainConfig, enabled } = body;

  const [result] = await db
    .insert(uiFlows)
    .values({
      tenantId,
      name,
      slug,
      description,
      definition: definition ?? { pages: [], navigation: { type: 'top-bar', items: [] }, routing: { defaultPage: '' }, footer: { enabled: false } },
      themeConfig: themeConfig ?? null,
      domainConfig: domainConfig ?? null,
      enabled: enabled ?? true,
    })
    .returning();

  // Sync pages from definition
  if (result.definition && (result.definition as any).pages) {
    const pages = (result.definition as any).pages;
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      await db.insert(uiFlowPages).values({
        uiFlowId: result.id,
        tenantId: result.tenantId,
        slug: page.slug,
        title: page.title,
        pageType: page.type,
        formId: page.formRef ? parseInt(page.formRef, 10) : null,
        config: page.config ?? null,
        position: i,
      });
    }
  }

  eventBus.emit('ui-flows.flow.created', {
    id: result.id,
    tenantId: result.tenantId,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result, { status: 201 });
}
