import { NextRequest } from 'next/server';
import { sql, asc, desc, eq, and, or, ilike, isNull, inArray } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { getTenantIdsFromRequest } from '@oven/module-auth/auth-utils';
import { files } from '../schema';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/files.
// Keep this array explicit — do NOT reach for Object.keys(files) since
// that would silently expand the allowlist as the schema grows (e.g.
// when the sprint-05 `visibility` column lands).
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'filename',
  'mimeType',
  'sizeBytes',
  'folder',
  'sourceModule',
  'createdAt',
] as const;

// GET /api/files — List files
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(files, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

  const callerTenantIds = await getTenantIdsFromRequest(request);

  const conditions: ReturnType<typeof eq>[] = [];

  // Tenant scoping: show platform-global rows (tenantId IS NULL)
  // plus rows belonging to the caller's tenants.
  if (callerTenantIds.length > 0) {
    conditions.push(
      or(isNull(files.tenantId), inArray(files.tenantId, callerTenantIds))!,
    );
  }

  if (params.filter.q) {
    conditions.push(ilike(files.filename, `%${params.filter.q}%`));
  }
  if (params.filter.folder) {
    conditions.push(eq(files.folder, params.filter.folder as string));
  }
  if (params.filter.tenantId) {
    conditions.push(eq(files.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }
  if (params.filter.mimeType) {
    conditions.push(ilike(files.mimeType, `%${params.filter.mimeType as string}%`));
  }
  if (params.filter.sourceModule) {
    conditions.push(eq(files.sourceModule, params.filter.sourceModule as string));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(files).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(files).where(where),
  ]);

  return listResponse(data, 'files', params, countResult[0].count);
}
