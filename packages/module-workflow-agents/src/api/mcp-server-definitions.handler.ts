import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { mcpServerDefinitions } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(mcpServerDefinitions.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.workflowId) conditions.push(eq(mcpServerDefinitions.workflowId, Number(params.filter.workflowId)));
  if (params.filter?.enabled !== undefined) conditions.push(eq(mcpServerDefinitions.enabled, Boolean(params.filter.enabled)));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(mcpServerDefinitions).where(where).orderBy(desc(mcpServerDefinitions.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(mcpServerDefinitions).where(where),
  ]);
  return listResponse(rows, 'mcp-server-definitions', params, Number(count));
}
