import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { rlsPolicyVersions } from '../schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const db = getDb();
  const { id, versionId } = await params;

  const [result] = await db
    .select()
    .from(rlsPolicyVersions)
    .where(
      and(
        eq(rlsPolicyVersions.policyId, parseInt(id, 10)),
        eq(rlsPolicyVersions.id, parseInt(versionId, 10))
      )
    );

  if (!result) return notFound('Version not found');
  return NextResponse.json(result);
}
