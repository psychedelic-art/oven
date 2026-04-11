import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { chatMcpConnections } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(chatMcpConnections.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.status) conditions.push(eq(chatMcpConnections.status, String(params.filter.status)));
  if (params.filter?.transport) conditions.push(eq(chatMcpConnections.transport, String(params.filter.transport)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatMcpConnections).where(where).orderBy(desc(chatMcpConnections.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatMcpConnections).where(where),
  ]);
  return listResponse(rows, 'chat-mcp-connections', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.name) return badRequest('Missing required field: name');
  if (!body.transport) return badRequest('Missing required field: transport');
  if (!body.url) return badRequest('Missing required field: url');
  if (!['sse', 'http'].includes(body.transport)) return badRequest('Invalid transport. Must be "sse" or "http"');
  const [created] = await db.insert(chatMcpConnections).values({
    tenantId: body.tenantId ? Number(body.tenantId) : null,
    name: body.name,
    transport: body.transport,
    url: body.url,
    credentials: body.credentials ?? null,
    status: 'disconnected',
  }).returning();
  return NextResponse.json(created, { status: 201 });
}
