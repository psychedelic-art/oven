import '@/lib/modules';
import '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@oven/module-registry/db';
import { eventWirings } from '@oven/module-registry/schema';
import { wiringRuntime } from '@oven/module-registry';
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';
import { count, asc, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const db = getDb();
  const params = parseListParams(req);

  const orderCol = eventWirings[params.sort as keyof typeof eventWirings] ?? eventWirings.id;
  const orderFn = params.order === 'desc' ? desc : asc;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(eventWirings)
      .orderBy(orderFn(orderCol as any))
      .limit(params.limit)
      .offset(params.offset),
    db.select({ count: count() }).from(eventWirings),
  ]);

  const total = totalResult[0]?.count ?? 0;
  return listResponse(rows, 'event-wirings', params, total);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();

  const [row] = await db
    .insert(eventWirings)
    .values({
      sourceModule: body.sourceModule,
      sourceEvent: body.sourceEvent,
      targetModule: body.targetModule,
      targetAction: body.targetAction,
      transform: body.transform ?? null,
      condition: body.condition ?? null,
      label: body.label ?? null,
      description: body.description ?? null,
      enabled: body.enabled ?? true,
    })
    .returning();

  wiringRuntime.invalidateCache();

  return NextResponse.json(row, { status: 201 });
}
