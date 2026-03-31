import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { providers } from '../schema';

// GET /api/providers — List providers
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (providers as any)[params.sort] ?? providers.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(providers.name, `%${params.filter.q}%`));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(providers.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(providers).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(providers).where(where),
  ]);

  return listResponse(data, 'providers', params, countResult[0].count);
}

// POST /api/providers — Create provider
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(providers).values(body).returning();

  eventBus.emit('subscriptions.provider.created', {
    id: result.id,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result, { status: 201 });
}
