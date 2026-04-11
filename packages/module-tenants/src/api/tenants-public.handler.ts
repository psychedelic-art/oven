import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { registry } from '@oven/module-registry';
import { tenants } from '../schema';
import { moduleConfigs } from '@oven/module-config/schema';
import { computeBusinessHours } from '../utils';
import {
  assembleTenantPublicResponse,
  type TenantPublicResolvedConfig,
} from './_utils/public-response';

const CONFIG_KEYS = [
  'BUSINESS_NAME', 'NIT', 'LOGO', 'TIMEZONE', 'LOCALE', 'SCHEDULE',
  'AUTHORIZED_SERVICES', 'PAYMENT_METHODS', 'TONE', 'HUMAN_CONTACT_INFO',
  'EMERGENCY_INSTRUCTIONS', 'SCHEDULING_URL',
  'WELCOME_MESSAGE_BUSINESS_HOURS', 'WELCOME_MESSAGE_OUT_OF_HOURS',
];

// GET /api/tenants/[slug]/public — Public tenant config (composition endpoint)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const db = getDb();
  const { slug } = await params;

  // 1. Resolve tenant identity from slim table
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.slug, slug), eq(tenants.enabled, true)))
    .limit(1);

  if (!tenant) return notFound('Tenant not found');

  // 2. Batch-resolve config values via direct DB query (not HTTP, for performance)
  // Fetch tenant-scoped entries
  const tenantRows = await db
    .select()
    .from(moduleConfigs)
    .where(
      and(
        eq(moduleConfigs.tenantId, tenant.id),
        eq(moduleConfigs.moduleName, 'tenants'),
        eq(moduleConfigs.scope, 'module'),
        isNull(moduleConfigs.scopeId),
        inArray(moduleConfigs.key, CONFIG_KEYS)
      )
    );

  // Fetch platform-global entries
  const platformRows = await db
    .select()
    .from(moduleConfigs)
    .where(
      and(
        isNull(moduleConfigs.tenantId),
        eq(moduleConfigs.moduleName, 'tenants'),
        eq(moduleConfigs.scope, 'module'),
        isNull(moduleConfigs.scopeId),
        inArray(moduleConfigs.key, CONFIG_KEYS)
      )
    );

  // Build resolved config: tenant > platform > schema default
  const resolved: Record<string, unknown> = {};
  const mod = registry.getModule('tenants');

  for (const key of CONFIG_KEYS) {
    const tenantRow = tenantRows.find((r) => r.key === key);
    if (tenantRow) {
      resolved[key] = tenantRow.value;
      continue;
    }

    const platformRow = platformRows.find((r) => r.key === key);
    if (platformRow) {
      resolved[key] = platformRow.value;
      continue;
    }

    // Schema default
    const schemaEntry = mod?.configSchema?.find((e: any) => e.key === key);
    resolved[key] = schemaEntry?.defaultValue ?? null;
  }

  // 3. Compute business hours (side effect: clock read)
  const schedule = resolved.SCHEDULE as Record<string, { open: string; close: string }> | null;
  const timezone = (resolved.TIMEZONE as string) || 'America/Bogota';
  const isBusinessHours = computeBusinessHours(schedule, timezone);

  // 4. Assemble the public body via the pure helper. Sprint-03 DRIFT-2:
  // `assembleTenantPublicResponse` has a typed return that explicitly
  // omits `id`, so any future edit that tries to surface numeric ids
  // on the public endpoint fails tsc.
  return NextResponse.json(
    assembleTenantPublicResponse(
      { name: tenant.name },
      resolved as TenantPublicResolvedConfig,
      isBusinessHours,
    ),
  );
}
