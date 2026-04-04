import { NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@oven/module-registry/api-utils';
import { usageMeteringService } from '../engine/usage-metering';

// GET /api/usage/summary?tenantId=X&billingCycle=2026-04 — Aggregated usage per service
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get('tenantId');
  const billingCycle = searchParams.get('billingCycle') ?? undefined;

  if (!tenantIdParam) {
    return badRequest('tenantId query parameter is required');
  }

  const tenantId = parseInt(tenantIdParam, 10);
  if (isNaN(tenantId)) {
    return badRequest('tenantId must be a valid number');
  }

  const summary = await usageMeteringService.getUsageSummary(tenantId, billingCycle);

  return NextResponse.json({
    tenantId,
    billingCycle: billingCycle ?? new Date().toISOString().slice(0, 7),
    usage: summary,
  });
}
