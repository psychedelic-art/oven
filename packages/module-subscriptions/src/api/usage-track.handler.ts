import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { badRequest } from '@oven/module-registry/api-utils';
import { usageRecords } from '../schema';
import { usageMeteringService } from '../engine/usage-metering';

/** UUID v4 pattern for idempotency key validation. */
const IDEMPOTENCY_KEY_PATTERN = /^[a-f0-9-]{36}$/;

// POST /api/usage/track — Record a usage event
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tenantId, serviceSlug, amount, upstreamCostCents, metadata } = body;

  if (!tenantId || !serviceSlug || amount == null) {
    return badRequest('tenantId, serviceSlug, and amount are required');
  }

  if (typeof amount !== 'number' || amount < 0) {
    return badRequest('amount must be a non-negative number');
  }

  // Idempotency key support
  const idempotencyKey = request.headers.get('x-usage-idempotency-key');
  if (idempotencyKey !== null) {
    if (!IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      return badRequest('X-Usage-Idempotency-Key must be a UUID v4 (36 hex chars with dashes)');
    }

    // Check for existing record with this key
    const db = getDb();
    const [existing] = await db
      .select({ id: usageRecords.id })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.tenantId, tenantId),
          eq(usageRecords.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    if (existing) {
      // Already recorded — return 200 (idempotent success)
      return NextResponse.json(
        { recorded: true, remaining: 0, exceeded: false, deduplicated: true },
        { status: 200 },
      );
    }
  }

  const result = await usageMeteringService.trackUsage({
    tenantId,
    serviceSlug,
    amount,
    upstreamCostCents,
    metadata,
    idempotencyKey: idempotencyKey ?? undefined,
  });

  return NextResponse.json(result, { status: result.recorded ? 201 : 400 });
}
