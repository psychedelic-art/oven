import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agents, agentVersions } from '../schema';
import { eq } from 'drizzle-orm';

export async function GET(_request: NextRequest, context?: { params: Promise<{ id: string }> }) {
  const { id } = await context!.params;
  const db = getDb();
  const rows = await db.select().from(agents).where(eq(agents.id, Number(id)));
  if (rows.length === 0) return notFound();
  return NextResponse.json(rows[0]);
}

export async function PUT(request: NextRequest, context?: { params: Promise<{ id: string }> }) {
  const { id } = await context!.params;
  const body = await request.json();
  const db = getDb();
  const existing = await db.select().from(agents).where(eq(agents.id, Number(id)));
  if (existing.length === 0) return notFound();
  const agent = existing[0];
  const behavioralFields = ['llmConfig', 'systemPrompt', 'toolBindings', 'exposedParams', 'inputConfig'];
  const contentChanged = behavioralFields.some((f) => body[f] !== undefined && JSON.stringify(body[f]) !== JSON.stringify((agent as Record<string, unknown>)[f]));
  if (contentChanged) {
    await db.insert(agentVersions).values({
      agentId: agent.id, version: agent.version,
      definition: { llmConfig: agent.llmConfig, systemPrompt: agent.systemPrompt, toolBindings: agent.toolBindings, exposedParams: agent.exposedParams, inputConfig: agent.inputConfig },
    });
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ['name', 'slug', 'description', 'llmConfig', 'systemPrompt', 'exposedParams', 'toolBindings', 'inputConfig', 'workflowAgentId', 'metadata', 'enabled']) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (contentChanged) updates.version = agent.version + 1;
  const [updated] = await db.update(agents).set(updates).where(eq(agents.id, Number(id))).returning();
  await eventBus.emit('agents.agent.updated', { id: updated.id, tenantId: updated.tenantId, name: updated.name, slug: updated.slug, version: updated.version });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context?: { params: Promise<{ id: string }> }) {
  const { id } = await context!.params;
  const db = getDb();
  const existing = await db.select().from(agents).where(eq(agents.id, Number(id)));
  if (existing.length === 0) return notFound();
  await db.delete(agents).where(eq(agents.id, Number(id)));
  await eventBus.emit('agents.agent.deleted', { id: existing[0].id, slug: existing[0].slug });
  return NextResponse.json({ id: Number(id) });
}
