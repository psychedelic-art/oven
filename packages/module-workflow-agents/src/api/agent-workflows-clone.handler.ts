import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { agentWorkflows } from '../schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const body = await req.json();
  const db = getDb();

  // Load source workflow
  const rows = await db.select().from(agentWorkflows).where(eq(agentWorkflows.id, Number(id)));
  if (rows.length === 0) return notFound('Source workflow not found');
  const source = rows[0] as Record<string, unknown>;

  // Generate clone name/slug
  const cloneName = body.name ?? `${source.name} (Copy)`;
  const cloneSlug = body.slug ?? `${source.slug}-copy-${Date.now()}`.slice(0, 128);

  const [cloned] = await db.insert(agentWorkflows).values({
    tenantId: source.tenantId as number | null,
    name: cloneName,
    slug: cloneSlug,
    description: source.description as string | null,
    agentId: source.agentId as number | null,
    definition: source.definition,
    agentConfig: source.agentConfig,
    memoryConfig: source.memoryConfig,
    status: 'draft',
    version: 1,
    category: source.category as string | null,
    tags: source.tags,
    isTemplate: false,
    clonedFrom: Number(id),
    templateSlug: source.templateSlug as string | null,
  }).returning();

  await eventBus.emit('workflow-agents.workflow.created', { id: cloned.id, name: cloned.name, slug: cloned.slug });

  return NextResponse.json(cloned, { status: 201 });
}
