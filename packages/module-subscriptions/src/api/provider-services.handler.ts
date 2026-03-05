import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { providerServices } from '../schema';

// GET /api/provider-services — List provider-service mappings
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (providerServices as any)[params.sort] ?? providerServices.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  const conditions: any[] = [];
  if (params.filter.providerId) {
    conditions.push(eq(providerServices.providerId, parseInt(params.filter.providerId as string, 10)));
  }
  if (params.filter.serviceId) {
    conditions.push(eq(providerServices.serviceId, parseInt(params.filter.serviceId as string, 10)));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(providerServices.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(providerServices).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(providerServices).where(where),
  ]);

  return listResponse(data, 'provider-services', params, countResult[0].count);
}

// POST /api/provider-services — Create provider-service mapping
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const [result] = await db.insert(providerServices).values(body).returning();

  return NextResponse.json(result, { status: 201 });
}
