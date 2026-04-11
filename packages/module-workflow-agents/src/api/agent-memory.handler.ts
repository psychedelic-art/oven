import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { agentMemory } from '../schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(agentMemory.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.agentId) conditions.push(eq(agentMemory.agentId, Number(params.filter.agentId)));
  if (params.filter?.key) conditions.push(eq(agentMemory.key, String(params.filter.key)));
  if (params.filter?.q) conditions.push(ilike(agentMemory.content, `%${String(params.filter.q)}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(agentMemory).where(where).orderBy(desc(agentMemory.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(agentMemory).where(where),
  ]);
  return listResponse(rows, 'agent-memory', params, Number(count));
}

export async function DELETE(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const existing = await db.select().from(agentMemory).where(eq(agentMemory.id, Number(id))).limit(1);
  if (existing.length === 0) return notFound();
  await db.delete(agentMemory).where(eq(agentMemory.id, Number(id)));
  return NextResponse.json({ id: Number(id) });
}
