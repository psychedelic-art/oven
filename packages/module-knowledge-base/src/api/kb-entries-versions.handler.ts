import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { kbEntryVersions } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  const { id } = await context!.params;
  const db = getDb();

  const versions = await db.select()
    .from(kbEntryVersions)
    .where(eq(kbEntryVersions.entryId, Number(id)))
    .orderBy(desc(kbEntryVersions.version));

  return NextResponse.json(versions);
}
