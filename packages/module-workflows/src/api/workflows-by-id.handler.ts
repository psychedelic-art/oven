import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry/event-bus';
import { workflows, workflowVersions } from '../schema';

export async function GET(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid workflow ID');

  const [row] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, numId))
    .limit(1);

  if (!row) return notFound('Workflow not found');
  return NextResponse.json(row);
}

export async function PUT(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid workflow ID');

  const body = await request.json();

  const [existing] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, numId))
    .limit(1);
  if (!existing) return notFound('Workflow not found');

  // Increment version if definition changed
  const newVersion =
    body.definition && JSON.stringify(body.definition) !== JSON.stringify(existing.definition)
      ? existing.version + 1
      : existing.version;

  // Save old definition as version snapshot when definition changes
  if (newVersion !== existing.version) {
    await db.insert(workflowVersions).values({
      workflowId: numId,
      version: existing.version,
      definition: existing.definition,
      description: body.versionDescription ?? null,
    });
  }

  const [result] = await db
    .update(workflows)
    .set({
      name: body.name ?? existing.name,
      slug: body.slug ?? existing.slug,
      description: body.description !== undefined ? body.description : existing.description,
      definition: body.definition ?? existing.definition,
      triggerEvent: body.triggerEvent !== undefined ? body.triggerEvent : existing.triggerEvent,
      triggerCondition:
        body.triggerCondition !== undefined
          ? body.triggerCondition
          : existing.triggerCondition,
      enabled: body.enabled !== undefined ? body.enabled : existing.enabled,
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, numId))
    .returning();

  await eventBus.emit('workflows.workflow.updated', {
    id: result.id,
    name: result.name,
    version: newVersion,
  });

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid workflow ID');

  const [deleted] = await db
    .delete(workflows)
    .where(eq(workflows.id, numId))
    .returning();

  if (!deleted) return notFound('Workflow not found');

  await eventBus.emit('workflows.workflow.deleted', {
    id: deleted.id,
    name: deleted.name,
  });

  return NextResponse.json(deleted);
}
