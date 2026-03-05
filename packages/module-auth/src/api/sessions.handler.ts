import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { authSessions } from '../schema';

// GET /api/auth-sessions — List active sessions
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (authSessions as any)[params.sort] ?? authSessions.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(authSessions).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.userId) {
    conditions.push(eq(authSessions.userId, parseInt(params.filter.userId as string, 10)));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(authSessions);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'auth-sessions', params, countResult[0].count);
}
