import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { rlsPolicies, rlsPolicyVersions } from '../schema';

/**
 * POST /api/rls-policies/:id/versions/:versionId/restore
 * Restores a policy definition from a specific version.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const db = getDb();
  const { id, versionId } = await params;
  const policyId = parseInt(id, 10);

  // Find the version to restore
  const [version] = await db
    .select()
    .from(rlsPolicyVersions)
    .where(
      and(
        eq(rlsPolicyVersions.policyId, policyId),
        eq(rlsPolicyVersions.id, parseInt(versionId, 10))
      )
    );

  if (!version) return notFound('Version not found');

  // Get the current policy
  const [policy] = await db
    .select()
    .from(rlsPolicies)
    .where(eq(rlsPolicies.id, policyId));

  if (!policy) return notFound('RLS policy not found');

  const newVersion = policy.version + 1;

  // Update the policy with the restored definition
  const [result] = await db
    .update(rlsPolicies)
    .set({
      definition: version.definition,
      version: newVersion,
      status: 'draft',
      compiledSql: null,
      updatedAt: new Date(),
    })
    .where(eq(rlsPolicies.id, policyId))
    .returning();

  // Create a new version snapshot
  await db.insert(rlsPolicyVersions).values({
    policyId,
    version: newVersion,
    definition: version.definition,
    description: `Restored from version ${version.version}`,
  });

  return NextResponse.json(result);
}
