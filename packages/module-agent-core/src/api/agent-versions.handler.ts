import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getDb } from '@oven/module-registry/db';
import { agentVersions } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(_req: NextRequest, ctx?: { params: Promise<{ id: string }> }) {
  const { id } = await ctx!.params;
  const db = getDb();
  const versions = await db.select().from(agentVersions)
    .where(eq(agentVersions.agentId, Number(id)))
    .orderBy(desc(agentVersions.version));
  return NextResponse.json(versions);
}
