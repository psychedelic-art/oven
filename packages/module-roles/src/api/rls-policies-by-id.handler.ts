import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { rlsPolicies, rlsPolicyVersions } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(rlsPolicies)
    .where(eq(rlsPolicies.id, parseInt(id, 10)));

  if (!result) return notFound('RLS policy not found');
  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();
  const policyId = parseInt(id, 10);

  const [existing] = await db
    .select()
    .from(rlsPolicies)
    .where(eq(rlsPolicies.id, policyId));

  if (!existing) return notFound('RLS policy not found');

  // Check if definition changed — if so, increment version and create snapshot
  const definitionChanged =
    body.definition &&
    JSON.stringify(body.definition) !== JSON.stringify(existing.definition);

  const newVersion = definitionChanged ? existing.version + 1 : existing.version;

  const [result] = await db
    .update(rlsPolicies)
    .set({
      ...body,
      version: newVersion,
      // If definition changed, reset status to draft
      ...(definitionChanged ? { status: 'draft', compiledSql: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(rlsPolicies.id, policyId))
    .returning();

  // Create version snapshot if definition changed
  if (definitionChanged) {
    await db.insert(rlsPolicyVersions).values({
      policyId,
      version: newVersion,
      definition: body.definition,
      description: body.versionDescription ?? `Version ${newVersion}`,
    });
  }

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const policyId = parseInt(id, 10);

  const [existing] = await db
    .select()
    .from(rlsPolicies)
    .where(eq(rlsPolicies.id, policyId));

  if (!existing) return notFound('RLS policy not found');

  // If applied, warn — but still allow deletion (drop the PG policy too)
  if (existing.status === 'applied' && existing.compiledSql) {
    try {
      const safeName = existing.slug.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      const safeTable = existing.targetTable.replace(/[^a-zA-Z0-9_]/g, '');
      await db.execute(
        // Use template literal from drizzle
        { sql: `DROP POLICY IF EXISTS "${safeName}" ON ${safeTable}`, params: [] } as any
      );
    } catch {
      // Non-critical — policy may already be dropped
    }
  }

  // Delete versions first
  await db.delete(rlsPolicyVersions).where(eq(rlsPolicyVersions.policyId, policyId));
  const [result] = await db.delete(rlsPolicies).where(eq(rlsPolicies.id, policyId)).returning();

  return NextResponse.json(result);
}
