import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { permissions } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (permissions as any)[params.sort] ?? permissions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(permissions).orderBy(orderFn);

  if (params.filter.resource) {
    query = query.where(eq(permissions.resource, params.filter.resource as string));
  }
  if (params.filter.q) {
    query = query.where(ilike(permissions.slug, `%${params.filter.q}%`));
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(permissions),
  ]);

  return listResponse(data, 'permissions', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Auto-generate slug if not provided
  if (!body.slug && body.resource && body.action) {
    body.slug = `${body.resource}.${body.action}`;
  }

  const [result] = await db.insert(permissions).values(body).returning();
  return NextResponse.json(result, { status: 201 });
}
