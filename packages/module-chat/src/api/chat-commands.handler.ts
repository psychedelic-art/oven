import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatCommands } from '../schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(chatCommands.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.category) conditions.push(eq(chatCommands.category, String(params.filter.category)));
  if (params.filter?.isBuiltIn !== undefined) conditions.push(eq(chatCommands.isBuiltIn, Boolean(params.filter.isBuiltIn)));
  if (params.filter?.enabled !== undefined) conditions.push(eq(chatCommands.enabled, Boolean(params.filter.enabled)));
  if (params.filter?.q) conditions.push(ilike(chatCommands.name, `%${String(params.filter.q)}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatCommands).where(where).orderBy(desc(chatCommands.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatCommands).where(where),
  ]);
  return listResponse(rows, 'chat-commands', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.name) return badRequest('Missing required field: name');
  if (!body.slug) return badRequest('Missing required field: slug');
  if (!body.description) return badRequest('Missing required field: description');
  if (!body.handler) return badRequest('Missing required field: handler');
  const [created] = await db.insert(chatCommands).values({
    tenantId: body.tenantId ? Number(body.tenantId) : null,
    name: body.name,
    slug: body.slug,
    description: body.description,
    category: body.category ?? 'general',
    handler: body.handler,
    args: body.args ?? null,
    isBuiltIn: false,
    enabled: body.enabled ?? true,
  }).returning();
  return NextResponse.json(created, { status: 201 });
}
