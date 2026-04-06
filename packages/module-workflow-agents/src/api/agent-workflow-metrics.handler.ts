import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getWorkflowMetrics, getNodeMetrics } from '../engine/metrics-collector';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const workflowId = url.searchParams.get('workflowId');

  if (!workflowId) {
    return NextResponse.json({ error: 'workflowId required' }, { status: 400 });
  }

  const dateFrom = url.searchParams.get('dateFrom') ? new Date(url.searchParams.get('dateFrom')!) : undefined;
  const dateTo = url.searchParams.get('dateTo') ? new Date(url.searchParams.get('dateTo')!) : undefined;

  const [workflowMetrics, nodeMetrics] = await Promise.all([
    getWorkflowMetrics(Number(workflowId), dateFrom, dateTo),
    getNodeMetrics(Number(workflowId)),
  ]);

  return NextResponse.json({ workflow: workflowMetrics, nodes: nodeMetrics });
}
