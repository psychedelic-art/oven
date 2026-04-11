import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { chatSkills } from '../schema';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const db = getDb();
  const conditions = [];
  if (params.filter?.tenantId) conditions.push(eq(chatSkills.tenantId, Number(params.filter.tenantId)));
  if (params.filter?.source) conditions.push(eq(chatSkills.source, String(params.filter.source)));
  if (params.filter?.isBuiltIn !== undefined) conditions.push(eq(chatSkills.isBuiltIn, Boolean(params.filter.isBuiltIn)));
  if (params.filter?.enabled !== undefined) conditions.push(eq(chatSkills.enabled, Boolean(params.filter.enabled)));
  if (params.filter?.q) conditions.push(ilike(chatSkills.name, `%${String(params.filter.q)}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(chatSkills).where(where).orderBy(desc(chatSkills.updatedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(chatSkills).where(where),
  ]);
  return listResponse(rows, 'chat-skills', params, Number(count));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  if (!body.name) return badRequest('Missing required field: name');
  if (!body.slug) return badRequest('Missing required field: slug');
  if (!body.description) return badRequest('Missing required field: description');
  if (!body.promptTemplate) return badRequest('Missing required field: promptTemplate');
  const [created] = await db.insert(chatSkills).values({
    tenantId: body.tenantId ? Number(body.tenantId) : null,
    name: body.name,
    slug: body.slug,
    description: body.description,
    promptTemplate: body.promptTemplate,
    source: body.source ?? 'custom',
    params: body.params ?? null,
    isBuiltIn: false,
    enabled: body.enabled ?? true,
  }).returning();
  return NextResponse.json(created, { status: 201 });
}
