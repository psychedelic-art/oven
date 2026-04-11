import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatHooks } from '../schema';
import { eq, and, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(chatHooks.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.event) conditions.push(eq(chatHooks.event, String(params.filter.event)));
  if (params.filter?.enabled !== undefined) conditions.push(eq(chatHooks.enabled, Boolean(params.filter.enabled)));
  if (params.filter?.q) conditions.push(ilike(chatHooks.name, `%${String(params.filter.q)}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatHooks).where(where).orderBy(chatHooks.priority).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatHooks).where(where),
  ]);
  return listResponse(rows, 'chat-hooks', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.name) return badRequest('Missing required field: name');
  if (!body.event) return badRequest('Missing required field: event');
  if (!body.handler) return badRequest('Missing required field: handler');
  const validEvents = ['pre-message', 'post-message', 'pre-tool-use', 'post-tool-use', 'on-error', 'on-escalation', 'session-start', 'session-end'];
  if (!validEvents.includes(body.event)) return badRequest(`Invalid event. Must be one of: ${validEvents.join(', ')}`);
  const [created] = await db.insert(chatHooks).values({
    tenantId: body.tenantId ? Number(body.tenantId) : null,
    name: body.name,
    event: body.event,
    handler: body.handler,
    priority: body.priority ?? 100,
    enabled: body.enabled ?? true,
  }).returning();
  return NextResponse.json(created, { status: 201 });
}
