import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { tenantMembers } from '../schema';

// GET /api/tenant-members/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.id, parseInt(id, 10)));

  if (!result) return notFound('Tenant member not found');
  return NextResponse.json(result);
}

// DELETE /api/tenant-members/[id] — Remove a member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(tenantMembers)
    .where(eq(tenantMembers.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('Tenant member not found');

  eventBus.emit('tenants.member.removed', {
    tenantId: deleted.tenantId,
    userId: deleted.userId,
  });

  return NextResponse.json(deleted);
}
