import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { uiFlows, uiFlowPages } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(uiFlows)
    .where(eq(uiFlows.id, parseInt(id, 10)));

  if (!result) return notFound('UI Flow not found');
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  const [result] = await db
    .update(uiFlows)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(uiFlows.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('UI Flow not found');

  // Re-sync pages from definition if definition was updated
  if (body.definition && body.definition.pages) {
    await db.delete(uiFlowPages).where(eq(uiFlowPages.uiFlowId, result.id));
    const pages = body.definition.pages;
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

  eventBus.emit('ui-flows.flow.updated', {
    id: result.id,
    tenantId: result.tenantId,
    name: result.name,
    version: result.version,
  });

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const numId = parseInt(id, 10);

  // Delete related pages first
  await db.delete(uiFlowPages).where(eq(uiFlowPages.uiFlowId, numId));

  const [deleted] = await db
    .delete(uiFlows)
    .where(eq(uiFlows.id, numId))
    .returning();

  if (!deleted) return notFound('UI Flow not found');

  return NextResponse.json(deleted);
}
