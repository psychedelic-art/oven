import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { registry } from '@oven/module-registry';
import { badRequest } from '@oven/module-registry/api-utils';
import { moduleConfigs } from '../schema';

// GET /api/module-configs/resolve — 5-tier cascade resolution for a single key
export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const moduleName = url.searchParams.get('moduleName');
  const key = url.searchParams.get('key');
  const tenantId = url.searchParams.get('tenantId');
  const scopeId = url.searchParams.get('scopeId');

  if (!moduleName || !key) {
    return badRequest('moduleName and key are required');
  }

  const tenantIdNum = tenantId ? parseInt(tenantId, 10) : null;

  // Tier 1: Tenant instance override
  if (tenantIdNum && scopeId) {
    const [row] = await db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          eq(moduleConfigs.tenantId, tenantIdNum),
          eq(moduleConfigs.moduleName, moduleName),
          eq(moduleConfigs.scope, 'instance'),
          eq(moduleConfigs.scopeId, scopeId),
          eq(moduleConfigs.key, key)
        )
      )
      .limit(1);
    if (row) {
      return NextResponse.json({
        key,
        value: row.value,
        source: 'tenant-instance',
        tenantId: tenantIdNum,
        scopeId,
      });
    }
  }

  // Tier 2: Tenant module default
  if (tenantIdNum) {
    const [row] = await db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          eq(moduleConfigs.tenantId, tenantIdNum),
          eq(moduleConfigs.moduleName, moduleName),
          eq(moduleConfigs.scope, 'module'),
          isNull(moduleConfigs.scopeId),
          eq(moduleConfigs.key, key)
        )
      )
      .limit(1);
    if (row) {
      return NextResponse.json({
        key,
        value: row.value,
        source: 'tenant-module',
        tenantId: tenantIdNum,
        scopeId: null,
      });
    }
  }

  // Tier 3: Platform instance override
  if (scopeId) {
    const [row] = await db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          isNull(moduleConfigs.tenantId),
          eq(moduleConfigs.moduleName, moduleName),
          eq(moduleConfigs.scope, 'instance'),
          eq(moduleConfigs.scopeId, scopeId),
          eq(moduleConfigs.key, key)
        )
      )
      .limit(1);
    if (row) {
      return NextResponse.json({
        key,
        value: row.value,
        source: 'platform-instance',
        tenantId: null,
        scopeId,
      });
    }
  }

  // Tier 4: Platform module default
  const [platformRow] = await db
    .select()
    .from(moduleConfigs)
    .where(
      and(
        isNull(moduleConfigs.tenantId),
        eq(moduleConfigs.moduleName, moduleName),
        eq(moduleConfigs.scope, 'module'),
        isNull(moduleConfigs.scopeId),
        eq(moduleConfigs.key, key)
      )
    )
    .limit(1);
  if (platformRow) {
    return NextResponse.json({
      key,
      value: platformRow.value,
      source: 'platform-module',
      tenantId: null,
      scopeId: null,
    });
  }

  // Tier 5: Schema default from code
  const mod = registry.getModule(moduleName);
  if (mod?.configSchema) {
    const entry = mod.configSchema.find((e: any) => e.key === key);
    if (entry) {
      return NextResponse.json({
        key,
        value: entry.defaultValue,
        source: 'schema',
        tenantId: null,
        scopeId: null,
      });
    }
  }

  // Not found — return null default
  return NextResponse.json({
    key,
    value: null,
    source: 'default',
    tenantId: null,
    scopeId: null,
  });
}
