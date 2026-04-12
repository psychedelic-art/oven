import { type NextRequest, NextResponse } from 'next/server';
import { sql, asc, desc, eq, and, ilike } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { parseListParams, listResponse, badRequest } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiProviders } from '../schema';
import { encrypt, isEncrypted, maskApiKey } from '../engine/encryption';
import { providerRegistry } from '../engine/provider-registry';
import { getOrderColumn } from './_utils/sort';

// Whitelisted sort columns for GET /api/ai-providers (F-05-02).
// Keep this array explicit — do NOT reach for Object.keys(aiProviders).
const ALLOWED_SORTS = [
  'id',
  'tenantId',
  'name',
  'slug',
  'type',
  'defaultModel',
  'rateLimitRpm',
  'rateLimitTpm',
  'enabled',
  'createdAt',
  'updatedAt',
] as const;

function maskProviderRow(row: any) {
  return {
    ...row,
    apiKeyEncrypted: maskApiKey(row.apiKeyEncrypted),
    hasApiKey: !!row.apiKeyEncrypted,
  };
}

// GET /api/ai-providers — List providers
export async function GET(request: NextRequest) {
  const db = getDb();
  const params = parseListParams(request);

  const resolved = getOrderColumn(aiProviders, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);

  const conditions: any[] = [];
  if (params.filter.q) {
    conditions.push(ilike(aiProviders.name, `%${params.filter.q}%`));
  }
  if (params.filter.type) {
    conditions.push(eq(aiProviders.type, params.filter.type as string));
  }
  if (params.filter.enabled !== undefined) {
    conditions.push(eq(aiProviders.enabled, params.filter.enabled === 'true' || params.filter.enabled === true));
  }
  if (params.filter.tenantId) {
    conditions.push(eq(aiProviders.tenantId, parseInt(params.filter.tenantId as string, 10)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult] = await Promise.all([
    db.select().from(aiProviders).where(where).orderBy(orderFn).limit(params.limit).offset(params.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(aiProviders).where(where),
  ]);

  const masked = data.map(maskProviderRow);
  return listResponse(masked, 'ai-providers', params, countResult[0].count);
}

// POST /api/ai-providers — Create provider (encrypts API key)
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  // Encrypt the API key before storing
  if (body.apiKeyEncrypted && !isEncrypted(body.apiKeyEncrypted)) {
    body.apiKeyEncrypted = encrypt(body.apiKeyEncrypted);
  }

  const [result] = await db.insert(aiProviders).values(body).returning();

  // Clear provider cache so next resolve picks up the new key
  providerRegistry.clearCache();

  eventBus.emit('ai.provider.created', {
    id: result.id,
    name: result.name,
    slug: result.slug,
    type: result.type,
    tenantId: result.tenantId,
  });

  return NextResponse.json(maskProviderRow(result), { status: 201 });
}
