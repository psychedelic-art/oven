import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { rolePermissions } from '../schema';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .delete(rolePermissions)
    .where(eq(rolePermissions.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Role-permission mapping not found');
  return NextResponse.json(result);
}
