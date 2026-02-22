import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { hierarchyNodes } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const nodeId = parseInt(id, 10);

  const [result] = await db
    .select()
    .from(hierarchyNodes)
    .where(eq(hierarchyNodes.id, nodeId));

  if (!result) return notFound('Hierarchy node not found');

  // Also fetch ancestors via recursive CTE
  const ancestors = await db.execute(sql`
    WITH RECURSIVE tree AS (
      SELECT id, name, type, parent_id, 1 as depth
      FROM hierarchy_nodes WHERE id = ${nodeId}
      UNION ALL
      SELECT h.id, h.name, h.type, h.parent_id, t.depth + 1
      FROM hierarchy_nodes h JOIN tree t ON h.id = t.parent_id
    )
    SELECT * FROM tree ORDER BY depth DESC
  `);

  // Fetch direct children
  const children = await db
    .select()
    .from(hierarchyNodes)
    .where(eq(hierarchyNodes.parentId, nodeId));

  return NextResponse.json({
    ...result,
    ancestors: ancestors.rows ?? ancestors,
    children,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  // Prevent circular references
  if (body.parentId) {
    const nodeId = parseInt(id, 10);
    if (body.parentId === nodeId) {
      return NextResponse.json({ error: 'A node cannot be its own parent' }, { status: 400 });
    }
    // Check that the new parent is not a descendant
    const descendants = await db.execute(sql`
      WITH RECURSIVE tree AS (
        SELECT id FROM hierarchy_nodes WHERE parent_id = ${nodeId}
        UNION ALL
        SELECT h.id FROM hierarchy_nodes h JOIN tree t ON h.parent_id = t.id
      )
      SELECT id FROM tree
    `);
    const descIds = (descendants.rows ?? descendants).map((r: any) => r.id);
    if (descIds.includes(body.parentId)) {
      return NextResponse.json({ error: 'Cannot set parent to a descendant node' }, { status: 400 });
    }
  }

  const [result] = await db
    .update(hierarchyNodes)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(hierarchyNodes.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('Hierarchy node not found');
  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const nodeId = parseInt(id, 10);

  // Check for children
  const children = await db
    .select()
    .from(hierarchyNodes)
    .where(eq(hierarchyNodes.parentId, nodeId));

  if (children.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete node with ${children.length} child nodes. Remove children first.` },
      { status: 400 }
    );
  }

  const [result] = await db
    .delete(hierarchyNodes)
    .where(eq(hierarchyNodes.id, nodeId))
    .returning();

  if (!result) return notFound('Hierarchy node not found');
  return NextResponse.json(result);
}
