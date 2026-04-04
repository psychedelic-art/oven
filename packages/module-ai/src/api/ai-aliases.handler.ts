import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiModelAliases } from '../schema';

// GET /api/ai-aliases — List model aliases
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (aiModelAliases as any)[params.sort] ?? aiModelAliases.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(aiModelAliases.alias, `%${params.filter.q}%`));
  }
  if (params.filter.type) {
    conditions.push(eq(aiModelAliases.type, params.filter.type as string));
  }
  if (params.filter.providerId) {
    conditions.push(eq(aiModelAliases.providerId, parseInt(params.filter.providerId as string, 10)));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(aiModelAliases.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(aiModelAliases).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiModelAliases).where(where),
  ]);

  return listResponse(data, 'ai-aliases', params, countResult[0].count);
}

// POST /api/ai-aliases — Create model alias
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(aiModelAliases).values(body).returning();

  eventBus.emit('ai.alias.created', {
    id: result.id,
    alias: result.alias,
    providerId: result.providerId,
    modelId: result.modelId,
    type: result.type,
  });

  return NextResponse.json(result, { status: 201 });
}
