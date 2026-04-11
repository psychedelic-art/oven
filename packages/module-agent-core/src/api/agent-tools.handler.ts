import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { discoverTools } from '../engine/tool-wrapper';

export async function GET(_request: NextRequest) {
  const tools = discoverTools();
  return NextResponse.json(tools);
}
