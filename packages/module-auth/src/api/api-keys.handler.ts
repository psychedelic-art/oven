import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { apiKeys } from '../schema';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// GET /api/api-keys — List API keys
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (apiKeys as any)[params.sort] ?? apiKeys.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(apiKeys).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.tenantId) {
    conditions.push(eq(apiKeys.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.userId) {
    conditions.push(eq(apiKeys.userId, parseInt(params.filter.userId as string, 10)));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(apiKeys.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }
  if (params.filter.q) {
    conditions.push(ilike(apiKeys.name, `%${params.filter.q}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(apiKeys);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'api-keys', params, countResult[0].count);
}

// POST /api/api-keys — Create a new API key
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { name, tenantId, userId, permissions, expiresAt } = body;
  if (!name) {
    return NextResponse.json(
      { error: 'Name is required' },
      { status: 400 }
    );
  }

  // Generate a random API key
  const rawKey = randomBytes(32).toString('hex');
  const keyPrefix = rawKey.slice(0, 8);
  const keyHash = hashToken(rawKey);

  const [result] = await db
    .insert(apiKeys)
    .values({
      name,
      keyHash,
      keyPrefix,
      tenantId: tenantId ?? null,
      userId: userId ?? null,
      permissions: permissions ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  eventBus.emit('auth.apiKey.created', {
    id: result.id,
    name: result.name,
    keyPrefix,
    tenantId: result.tenantId,
    userId: result.userId,
  });

  // Return the full key only once — it cannot be retrieved again
  return NextResponse.json(
    {
      ...result,
      key: rawKey,
    },
    { status: 201 }
  );
}
