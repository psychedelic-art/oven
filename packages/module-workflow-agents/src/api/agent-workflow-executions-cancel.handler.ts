import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { badRequest, notFound } from '@oven/module-registry/api-utils';
import { transitionStatus } from '../engine/checkpoint-manager';

export async function POST(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const result = await transitionStatus(Number(id), 'cancelled');
  if (!result.success) return badRequest(result.error ?? 'Cannot cancel');
  return NextResponse.json({ id: Number(id), status: 'cancelled' });
}
