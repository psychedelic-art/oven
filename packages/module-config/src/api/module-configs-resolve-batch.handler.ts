import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { registry } from '@oven/module-registry';
import { badRequest } from '@oven/module-registry/api-utils';
import { moduleConfigs } from '../schema';

// GET /api/module-configs/resolve-batch — Batch resolve multiple keys via 5-tier cascade
export async function GET(request: NextRequest) {
  const db = getDb();
  const url = request.nextUrl;
  const moduleName = url.searchParams.get('moduleName');
  const keysParam = url.searchParams.get('keys');
  const tenantId = url.searchParams.get('tenantId');

  if (!moduleName || !keysParam) {
    return badRequest('moduleName and keys are required');
  }

  const keys = keysParam.split(',').map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    return badRequest('At least one key is required');
  }

  const tenantIdNum = tenantId ? parseInt(tenantId, 10) : null;

  // Fetch all potentially matching rows in one query per tier
  // We query all rows matching the keys and then resolve per-key in code

  const results: Record<string, { value: unknown; source: string }> = {};
  const unresolvedKeys = new Set(keys);

  // Tier 1+2: Tenant-scoped entries (if tenantId provided)
  if (tenantIdNum) {
    const tenantRows = await db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          eq(moduleConfigs.tenantId, tenantIdNum),
          eq(moduleConfigs.moduleName, moduleName),
          inArray(moduleConfigs.key, keys)
        )
      );

    // Tier 1: tenant-instance (scope=instance) — only if no scopeId filter needed (batch doesn't use scopeId)
    // Tier 2: tenant-module (scope=module, scopeId=null)
    for (const row of tenantRows) {
      if (unresolvedKeys.has(row.key) && row.scope === 'module' && row.scopeId === null) {
        results[row.key] = { value: row.value, source: 'tenant-module' };
        unresolvedKeys.delete(row.key);
      }
    }
  }

  // Tier 3+4: Platform-scoped entries
  if (unresolvedKeys.size > 0) {
    const platformRows = await db
      .select()
      .from(moduleConfigs)
      .where(
        and(
          isNull(moduleConfigs.tenantId),
          eq(moduleConfigs.moduleName, moduleName),
          inArray(moduleConfigs.key, Array.from(unresolvedKeys))
        )
      );

    // Tier 4: platform-module (scope=module, scopeId=null)
    for (const row of platformRows) {
      if (unresolvedKeys.has(row.key) && row.scope === 'module' && row.scopeId === null) {
        results[row.key] = { value: row.value, source: 'platform-module' };
        unresolvedKeys.delete(row.key);
      }
    }
  }

  // Tier 5: Schema defaults from code
  if (unresolvedKeys.size > 0) {
    const mod = registry.getModule(moduleName);
    if (mod?.configSchema) {
      for (const key of unresolvedKeys) {
        const entry = mod.configSchema.find((e: any) => e.key === key);
        if (entry) {
          results[key] = { value: entry.defaultValue, source: 'schema' };
          unresolvedKeys.delete(key);
        }
      }
    }
  }

  // Remaining unresolved keys get null defaults
  for (const key of unresolvedKeys) {
    results[key] = { value: null, source: 'default' };
  }

  return NextResponse.json({ results });
}
