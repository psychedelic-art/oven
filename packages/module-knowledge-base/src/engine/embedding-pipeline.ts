import { getDb } from '@oven/module-registry/db';
import { eventBus } from '@oven/module-registry';
import { aiEmbed } from '@oven/module-ai';
import { kbEntries } from '../schema';
import { eq, and, sql } from 'drizzle-orm';
import type { EmbedEntryResult, BulkEmbedOptions, BulkEmbedResult } from '../types';

// ─── Single Entry Embedding ────────────────────────────────

/**
 * Embed a single KB entry by ID.
 * Concatenates question + answer, calls aiEmbed(), stores vector via raw SQL,
 * and emits kb.entry.embedded event.
 */
export async function embedEntry(
  entryId: number,
  model?: string
): Promise<EmbedEntryResult> {
  const db = getDb();

  // 1. Fetch the entry
  const rows = await db.select().from(kbEntries).where(eq(kbEntries.id, entryId)).limit(1);
  if (rows.length === 0) {
    return { success: false, entryId, error: `Entry ${entryId} not found` };
  }

  const entry = rows[0];

  try {
    // 2. Concatenate question + answer
    const text = `${entry.question} ${entry.answer}`.trim();

    // 3. Call module-ai embed
    const result = await aiEmbed(text, model);
    const embeddingStr = `[${result.embedding.join(',')}]`;

    // 4. Store embedding via raw SQL (Drizzle doesn't support pgvector natively)
    await db.execute(sql`
      UPDATE kb_entries
      SET embedding = ${embeddingStr}::vector,
          metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
            embeddingStatus: 'embedded',
            embeddedAt: new Date().toISOString(),
            embeddingModel: model ?? 'text-embedding-3-small',
            embeddingError: null,
          })}::jsonb,
          updated_at = NOW()
      WHERE id = ${entryId}
    `);

    // 5. Emit event
    await eventBus.emit('kb.entry.embedded', {
      id: entryId,
      tenantId: entry.tenantId,
      embeddingModel: model ?? 'text-embedding-3-small',
      dimensions: result.embedding.length,
    });

    return {
      success: true,
      entryId,
      model: model ?? 'text-embedding-3-small',
      dimensions: result.embedding.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update metadata with failure status
    await db.update(kbEntries)
      .set({
        metadata: {
          ...(entry.metadata as Record<string, unknown> ?? {}),
          embeddingStatus: 'failed',
          embeddingError: errorMessage,
        },
        updatedAt: new Date(),
      })
      .where(eq(kbEntries.id, entryId));

    return { success: false, entryId, error: errorMessage };
  }
}

// ─── Bulk Embedding ────────────────────────────────────────

/**
 * Embed all unembedded entries for a tenant.
 * Optionally filter by categoryId and force re-embed.
 */
export async function bulkEmbed(options: BulkEmbedOptions): Promise<BulkEmbedResult> {
  const { tenantId, knowledgeBaseId, categoryId, force = false } = options;
  const db = getDb();

  // Build conditions
  const conditions = [
    eq(kbEntries.tenantId, tenantId),
    eq(kbEntries.enabled, true),
  ];

  if (knowledgeBaseId) {
    conditions.push(eq(kbEntries.knowledgeBaseId, knowledgeBaseId));
  }
  if (categoryId) {
    conditions.push(eq(kbEntries.categoryId, categoryId));
  }

  // Select entries needing embedding
  let entries;
  if (force) {
    entries = await db.select().from(kbEntries).where(and(...conditions));
  } else {
    // Only entries without 'embedded' status
    entries = await db.select().from(kbEntries).where(and(...conditions));
    entries = entries.filter((e) => {
      const meta = e.metadata as Record<string, unknown> | null;
      return !meta || meta.embeddingStatus !== 'embedded';
    });
  }

  if (entries.length === 0) {
    return { total: 0, embedded: 0, failed: 0, skipped: 0 };
  }

  let embedded = 0;
  let failed = 0;

  for (const entry of entries) {
    const result = await embedEntry(entry.id);
    if (result.success) {
      embedded++;
    } else {
      failed++;
    }
  }

  return {
    total: entries.length,
    embedded,
    failed,
    skipped: 0,
  };
}
