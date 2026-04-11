import { NextRequest, NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { usageMeteringService } from '../engine/usage-metering';

// GET /api/tenant-subscriptions/[id]/usage — Usage vs limits (remaining quota)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tid = parseInt(id, 10);

  if (isNaN(tid)) {
    return notFound('Invalid tenant ID');
  }

  const summary = await usageMeteringService.getUsageSummary(tid);

  if (summary.length === 0) {
    return notFound('No active subscription or no AI services in plan');
  }

  return NextResponse.json({
    tenantId: tid,
    billingCycle: new Date().toISOString().slice(0, 7),
    services: summary,
    totalUsed: summary.reduce((sum, s) => sum + s.used, 0),
    anyExceeded: summary.some((s) => s.used > s.limit),
  });
}
