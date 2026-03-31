import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { registry } from '@oven/module-registry';
import { tenants } from '../schema';
import { moduleConfigs } from '@oven/module-config/schema';
import { computeBusinessHours } from '../utils';

// GET /api/tenants/[id]/business-hours — Check if currently within business hours
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const tenantId = parseInt(id, 10);

  // Verify tenant exists
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  if (!tenant) return notFound('Tenant not found');

  // Resolve SCHEDULE and TIMEZONE from config
  const keys = ['SCHEDULE', 'TIMEZONE'];
  const resolved: Record<string, unknown> = {};

  // Tenant-scoped entries
  const tenantRows = await db
    .select()
    .from(moduleConfigs)
    .where(
      and(
        eq(moduleConfigs.tenantId, tenantId),
        eq(moduleConfigs.moduleName, 'tenants'),
        eq(moduleConfigs.scope, 'module'),
        isNull(moduleConfigs.scopeId),
        inArray(moduleConfigs.key, keys)
      )
    );

  for (const row of tenantRows) {
    resolved[row.key] = row.value;
  }

  // Fill missing from platform-global
  const missingKeys = keys.filter((k) => !(k in resolved));
  if (missingKeys.length > 0) {
    const platformRows = await db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          isNull(moduleConfigs.tenantId),
          eq(moduleConfigs.moduleName, 'tenants'),
          eq(moduleConfigs.scope, 'module'),
          isNull(moduleConfigs.scopeId),
          inArray(moduleConfigs.key, missingKeys)
        )
      );

    for (const row of platformRows) {
      if (!(row.key in resolved)) {
        resolved[row.key] = row.value;
      }
    }
  }

  // Fill remaining from schema defaults
  const mod = registry.getModule('tenants');
  for (const key of keys) {
    if (!(key in resolved) && mod?.configSchema) {
      const entry = mod.configSchema.find((e: any) => e.key === key);
      if (entry) resolved[key] = entry.defaultValue;
    }
  }

  const schedule = resolved.SCHEDULE as Record<string, { open: string; close: string }> | null;
  const timezone = (resolved.TIMEZONE as string) || 'America/Bogota';
  const isBusinessHours = computeBusinessHours(schedule, timezone);

  return NextResponse.json({
    tenantId,
    isBusinessHours,
    timezone,
    schedule,
  });
}
