import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { moduleConfigs } from '../schema';

export async function GET(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid config ID');

  const [row] = await db
    .select()
    .from(moduleConfigs)
    .where(eq(moduleConfigs.id, numId))
    .limit(1);

  if (!row) return notFound('Config not found');
  return NextResponse.json(row);
}

export async function PUT(
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid config ID');

  const body = await request.json();

  const [existing] = await db
    .select()
    .from(moduleConfigs)
    .where(eq(moduleConfigs.id, numId))
    .limit(1);
  if (!existing) return notFound('Config not found');

  const [result] = await db
    .update(moduleConfigs)
    .set({
      moduleName: body.moduleName ?? existing.moduleName,
      scope: body.scope ?? existing.scope,
      scopeId: body.scopeId !== undefined ? body.scopeId : existing.scopeId,
      key: body.key ?? existing.key,
      value: body.value !== undefined ? body.value : existing.value,
      description: body.description !== undefined ? body.description : existing.description,
      updatedAt: new Date(),
    })
    .where(eq(moduleConfigs.id, numId))
    .returning();

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) {
  const db = getDb();
  const { id } = (await context?.params) ?? {};
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return notFound('Invalid config ID');

  const [deleted] = await db
    .delete(moduleConfigs)
    .where(eq(moduleConfigs.id, numId))
    .returning();

  if (!deleted) return notFound('Config not found');
  return NextResponse.json(deleted);
}
