import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { usageMeteringService } from '../engine/usage-metering';

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

  // Read optional idempotency key from header
  const idempotencyKey = request.headers.get('x-usage-idempotency-key');
  if (idempotencyKey && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return badRequest(
      'X-Usage-Idempotency-Key must be a lowercase UUID (36 hex chars + hyphens)'
    );
  }

  const result = await usageMeteringService.trackUsage({
    tenantId,
    serviceSlug,
    amount,
    upstreamCostCents,
    metadata,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });

  // When an idempotency key is provided, return 200 for both the
  // initial write and any replay. Without a key, keep the original
  // 201 behaviour for new records.
  const status = !result.recorded
    ? 400
    : idempotencyKey
      ? 200
      : 201;

  return NextResponse.json(result, { status });
}
