import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { rlsPolicies, roles } from '../schema';
import { compileRlsPolicy } from '../rls-compiler';
import type { RlsPolicyDefinition, RlsCommand } from '../types';

/**
 * POST /api/rls-policies/:id/apply
 * Compiles the RLS policy definition to SQL and applies it to Postgres.
 */
export async function POST(
  _request: NextRequest,
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

  // Resolve role name if roleId is set
  let roleName: string | undefined;
  if (policy.roleId) {
    const [role] = await db.select().from(roles).where(eq(roles.id, policy.roleId));
    if (role) roleName = role.slug;
  }

  // Compile the definition to SQL
  const compiled = compileRlsPolicy(
    policy.slug,
    policy.targetTable,
    policy.command as RlsCommand,
    policy.definition as RlsPolicyDefinition,
    roleName
  );

  // Apply in a transaction
  try {
    // 1. Enable RLS on the table
    await db.execute(sql.raw(compiled.enableRls));

    // 2. Drop existing policy if any
    await db.execute(sql.raw(compiled.dropPolicy));

    // 3. Create the new policy
    await db.execute(sql.raw(compiled.sql));

    // 4. Update the policy record
    const [updated] = await db
      .update(rlsPolicies)
      .set({
        compiledSql: `${compiled.enableRls}\n${compiled.dropPolicy}\n${compiled.sql}`,
        status: 'applied',
        appliedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(rlsPolicies.id, policyId))
      .returning();

    return NextResponse.json({
      ...updated,
      appliedSql: compiled.sql,
      expression: compiled.expression,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to apply RLS policy: ${message}`, compiledSql: compiled.sql },
      { status: 500 }
    );
  }
}
