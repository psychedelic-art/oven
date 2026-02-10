import '@/lib/modules';
import '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@oven/module-registry/db';
import { eventWirings } from '@oven/module-registry/schema';
import { wiringRuntime } from '@oven/module-registry';
import { eq } from 'drizzle-orm';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const db = getDb();
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(eventWirings)
    .where(eq(eventWirings.id, parseInt(id, 10)));

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(row);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const db = getDb();
  const { id } = await ctx.params;
  const body = await req.json();

  const [row] = await db
    .update(eventWirings)
    .set({
      sourceModule: body.sourceModule,
      sourceEvent: body.sourceEvent,
      targetModule: body.targetModule,
      targetAction: body.targetAction,
      transform: body.transform ?? null,
      condition: body.condition ?? null,
      label: body.label ?? null,
      description: body.description ?? null,
      enabled: body.enabled ?? true,
      updatedAt: new Date(),
    })
    .where(eq(eventWirings.id, parseInt(id, 10)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  wiringRuntime.invalidateCache();
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const db = getDb();
  const { id } = await ctx.params;
  const [row] = await db
    .delete(eventWirings)
    .where(eq(eventWirings.id, parseInt(id, 10)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  wiringRuntime.invalidateCache();
  return NextResponse.json(row);
}
