import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike, or } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { users } from '../schema';
import { hashPassword } from '../auth-utils';

// GET /api/users — List users with filtering
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (users as any)[params.sort] ?? users.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(users).orderBy(orderFn);

  // Apply filters
  const conditions = [];
  if (params.filter.status) {
    conditions.push(eq(users.status, params.filter.status as string));
  }
  if (params.filter.defaultTenantId) {
    conditions.push(eq(users.defaultTenantId, parseInt(params.filter.defaultTenantId as string, 10)));
  }
  if (params.filter.q) {
    const search = `%${params.filter.q}%`;
    conditions.push(
      or(
        ilike(users.name, search),
        ilike(users.email, search)
      )!
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Build count query with same conditions
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(users);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as any;
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    countQuery,
  ]);

  return listResponse(data, 'users', params, countResult[0].count);
}

// POST /api/users — Create a new user (admin endpoint)
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { email, name, password, avatar, defaultTenantId, status } = body;
  if (!email || !name) {
    return NextResponse.json(
      { error: 'Email and name are required' },
      { status: 400 }
    );
  }

  // Check for existing user
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: 'A user with this email already exists' },
      { status: 409 }
    );
  }

  // Optionally hash password
  let passwordHash: string | null = null;
  if (password) {
    passwordHash = await hashPassword(password);
  }

  const [result] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
      avatar: avatar ?? null,
      defaultTenantId: defaultTenantId ?? null,
      status: status ?? 'active',
    })
    .returning();

  eventBus.emit('auth.user.created', {
    userId: result.id,
    email: result.email,
    name: result.name,
  });

  return NextResponse.json(result, { status: 201 });
}
