import { NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry/event-bus';
import { workflows } from '../schema';

export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const orderCol = (workflows as any)[params.sort] ?? workflows.id;
  const orderFn = params.order === 'desc' ? desc(orderCol) : asc(orderCol);

  let query = db.select().from(workflows).orderBy(orderFn);

  if (params.filter.q) {
    query = query.where(ilike(workflows.name, `%${params.filter.q}%`));
  }
  if (params.filter.enabled !== undefined) {
    query = query.where(eq(workflows.enabled, params.filter.enabled as boolean));
  }
  if (params.filter.triggerEvent) {
    query = query.where(
      eq(workflows.triggerEvent, params.filter.triggerEvent as string)
    );
  }

  const [data, countResult] = await Promise.all([
    query.limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(workflows),
  ]);

  return listResponse(data, 'workflows', params, countResult[0].count);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Generate slug from name if not provided
  const slug =
    body.slug ??
    body.name
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const [result] = await db
    .insert(workflows)
    .values({
      name: body.name,
      slug,
      description: body.description ?? null,
      definition: body.definition ?? {
        id: slug,
        initial: 'start',
        states: {
          start: { type: 'final' },
        },
      },
      triggerEvent: body.triggerEvent ?? null,
      triggerCondition: body.triggerCondition ?? null,
      enabled: body.enabled ?? true,
    })
    .returning();

  await eventBus.emit('workflows.workflow.created', {
    id: result.id,
    name: result.name,
    slug: result.slug,
  });

  return NextResponse.json(result, { status: 201 });
}
