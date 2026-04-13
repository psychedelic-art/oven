import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { checkRateLimit } from '@oven/module-registry/rate-limit';
import { users } from '../schema';
import { hashPassword } from '../auth-utils';

// POST /api/auth/register — Register a new user account
// Rate limit: 5 req / 600s per IP
export async function POST(request: NextRequest) {
  // Rate limit: 5 requests per 600 seconds, keyed by IP
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  const rl = checkRateLimit(`register:${ip}`, { maxRequests: 5, windowSeconds: 600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: { code: 'AUTH_RATE_LIMITED', message: 'Too many registration attempts. Try again later.' } },
      { status: 429 }
    );
  }

  const db = getDb();
  const body = await request.json();

  const { email, name, password } = body;
  if (!email || !name || !password) {
    return NextResponse.json(
      { error: 'Email, name, and password are required' },
      { status: 400 }
    );
  }

  // Check if user already exists
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

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email,
      name,
      passwordHash,
    })
    .returning();

  eventBus.emit('auth.user.registered', {
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      createdAt: user.createdAt,
    },
    { status: 201 }
  );
}
