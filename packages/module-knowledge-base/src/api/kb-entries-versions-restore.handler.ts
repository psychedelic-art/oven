import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { notFound } from '@oven/module-registry/api-utils';
import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { kbEntries, kbEntryVersions } from '../schema';
import { embedEntry } from '../engine/embedding-pipeline';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  context?: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await context!.params;
  const db = getDb();

  // Get current entry
  const entries = await db.select().from(kbEntries).where(eq(kbEntries.id, Number(id)));
  if (entries.length === 0) return notFound();
  const current = entries[0];

  // Get target version
  const versions = await db.select().from(kbEntryVersions).where(
    and(
      eq(kbEntryVersions.entryId, Number(id)),
      eq(kbEntryVersions.id, Number(versionId)),
    )
  );
  if (versions.length === 0) return notFound();
  const target = versions[0];

  // Snapshot current as a new version
  await db.insert(kbEntryVersions).values({
    entryId: current.id,
    version: current.version,
    question: current.question,
    answer: current.answer,
    keywords: current.keywords,
    description: 'Auto-snapshot before restore',
  });

  // Restore from target version
  const newVersion = current.version + 1;
  const body = await request.json().catch(() => ({}));

  const [updated] = await db.update(kbEntries).set({
    question: target.question,
    answer: target.answer,
    keywords: target.keywords,
    version: newVersion,
    metadata: {
      ...(current.metadata as Record<string, unknown> ?? {}),
      embeddingStatus: 'pending',
      restoredFrom: target.version,
    },
    updatedAt: new Date(),
  }).where(eq(kbEntries.id, Number(id))).returning();

  await eventBus.emit('kb.entry.updated', {
    id: updated.id,
    tenantId: updated.tenantId,
    question: updated.question,
    version: updated.version,
  });

  // Re-embed (non-blocking)
  embedEntry(updated.id).catch((err) => {
    console.error(`[KB] Failed to re-embed restored entry ${updated.id}:`, err);
  });

  return NextResponse.json(updated);
}
