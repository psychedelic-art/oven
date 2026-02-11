import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry/event-bus';
import { playerMapAssignments } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(playerMapAssignments)
    .where(eq(playerMapAssignments.id, parseInt(id, 10)));

  if (!result) return notFound('Assignment not found');
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const assignmentId = parseInt(id, 10);
  const body = await request.json();

  const [existing] = await db
    .select()
    .from(playerMapAssignments)
    .where(eq(playerMapAssignments.id, assignmentId));

  if (!existing) return notFound('Assignment not found');

  const [result] = await db
    .update(playerMapAssignments)
    .set({
      ...body,
      ...(body.isActive === false ? { leftAt: new Date() } : {}),
    })
    .where(eq(playerMapAssignments.id, assignmentId))
    .returning();

  // Emit position.player.left if assignment was deactivated
  if (body.isActive === false) {
    await eventBus.emit('position.player.left', {
      id: result.id,
      playerId: result.playerId,
      mapId: result.mapId,
      isActive: false,
      leftAt: result.leftAt,
      currentTileX: result.currentTileX,
      currentTileY: result.currentTileY,
    });
  }

  return NextResponse.json(result);
}
