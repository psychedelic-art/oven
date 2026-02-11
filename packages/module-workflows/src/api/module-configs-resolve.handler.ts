import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { registry } from '@oven/module-registry';
import { badRequest } from '@oven/module-registry/api-utils';
import { moduleConfigs } from '../schema';

/**
 * GET /api/module-configs/resolve?moduleName=maps&key=chunkSize&scopeId=5
 *
 * Resolves the effective config value using the cascade:
 *   1. instance override (scope=instance, scopeId=X)
 *   2. module default (scope=module, DB row)
 *   3. schema default (from module's configSchema definition)
 *   4. not found → null
 */
export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const moduleName = url.searchParams.get('moduleName');
  const key = url.searchParams.get('key');
  const scopeId = url.searchParams.get('scopeId');

  if (!moduleName || !key) {
    return badRequest('moduleName and key are required');
  }

  // Try instance-level override first
  if (scopeId) {
    const [instanceConfig] = await db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          eq(moduleConfigs.moduleName, moduleName),
          eq(moduleConfigs.scope, 'instance'),
          eq(moduleConfigs.scopeId, scopeId),
          eq(moduleConfigs.key, key)
        )
      )
      .limit(1);

    if (instanceConfig) {
      return NextResponse.json({
        key,
        value: instanceConfig.value,
        scope: 'instance',
        scopeId,
        source: 'instance',
      });
    }
  }

  // Fall back to module-level default
  const [moduleConfig] = await db
    .select()
    .from(moduleConfigs)
    .where(
      and(
        eq(moduleConfigs.moduleName, moduleName),
        eq(moduleConfigs.scope, 'module'),
        isNull(moduleConfigs.scopeId),
        eq(moduleConfigs.key, key)
      )
    )
    .limit(1);

  if (moduleConfig) {
    return NextResponse.json({
      key,
      value: moduleConfig.value,
      scope: 'module',
      scopeId: null,
      source: 'module',
    });
  }

  // Fall back to schema default from module's configSchema definition
  const mod = registry.getModule(moduleName);
  if (mod?.configSchema) {
    const schemaEntry = mod.configSchema.find((entry) => entry.key === key);
    if (schemaEntry) {
      return NextResponse.json({
        key,
        value: schemaEntry.defaultValue,
        scope: null,
        scopeId: null,
        source: 'schema',
      });
    }
  }

  // Not found anywhere
  return NextResponse.json({
    key,
    value: null,
    scope: null,
    scopeId: null,
    source: 'default',
  });
}
