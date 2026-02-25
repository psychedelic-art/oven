import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { rlsPolicies, roles } from '../schema';
import { compileRlsPolicy } from '../rls-compiler';
import type { RlsPolicyDefinition, RlsCommand } from '../types';

/**
 * POST /api/rls-policies/:id/preview
 * Compiles the RLS policy definition to SQL without applying it.
 * Optionally accepts a definition in the request body to preview unsaved changes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const policyId = parseInt(id, 10);

  const [policy] = await db
    .select()
    .from(rlsPolicies)
    .where(eq(rlsPolicies.id, policyId));

  if (!policy) return notFound('RLS policy not found');

  // Allow overriding definition from request body (for previewing unsaved changes)
  let definition = policy.definition as RlsPolicyDefinition;
  try {
    const body = await request.json();
    if (body.definition) {
      definition = body.definition;
    }
  } catch {
    // No body — use saved definition
  }

  // Resolve role name
  let roleName: string | undefined;
  if (policy.roleId) {
    const [role] = await db.select().from(roles).where(eq(roles.id, policy.roleId));
    if (role) roleName = role.slug;
  }

  try {
    const compiled = compileRlsPolicy(
      policy.slug,
      policy.targetTable,
      policy.command as RlsCommand,
      definition,
      roleName
    );

    return NextResponse.json({
      enableRls: compiled.enableRls,
      dropPolicy: compiled.dropPolicy,
      createPolicy: compiled.sql,
      expression: compiled.expression,
      fullSql: `${compiled.enableRls}\n${compiled.dropPolicy}\n${compiled.sql}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Compilation error: ${message}` },
      { status: 400 }
    );
  }
}
