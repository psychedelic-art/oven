import { NextRequest, NextResponse } from 'next/server';
import { sql, eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { tenantMembers } from '../schema';
import { checkLastOwnerRemoval } from './_utils/member-guards';

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
  const memberId = parseInt(id, 10);

  // Load the target row first so we can evaluate the last-owner guard
  // (DRIFT-3) without performing the destructive delete speculatively.
  const [target] = await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.id, memberId));

  if (!target) return notFound('Tenant member not found');

  // DRIFT-3: refuse the delete when this is the only remaining owner
  // row in the tenant. 409 Conflict with { error, field: 'role' } so
  // the dashboard form can highlight the role field.
  const [ownerCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenantMembers)
    .where(
      and(eq(tenantMembers.tenantId, target.tenantId), eq(tenantMembers.role, 'owner')),
    );

  const verdict = checkLastOwnerRemoval(target.role, ownerCountRow.count);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: verdict.message, field: verdict.field },
      { status: 409 },
    );
  }

  const [deleted] = await db
    .delete(tenantMembers)
    .where(eq(tenantMembers.id, memberId))
    .returning();

  if (!deleted) return notFound('Tenant member not found');

  eventBus.emit('tenants.member.removed', {
    tenantId: deleted.tenantId,
    userId: deleted.userId,
  });

  return NextResponse.json(deleted);
}
