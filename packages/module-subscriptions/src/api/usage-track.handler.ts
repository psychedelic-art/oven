import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { usageMeteringService } from '../engine/usage-metering';

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

  const result = await usageMeteringService.trackUsage({
    tenantId,
    serviceSlug,
    amount,
    upstreamCostCents,
    metadata,
  });

  return NextResponse.json(result, { status: result.recorded ? 201 : 400 });
}
