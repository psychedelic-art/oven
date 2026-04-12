import { type NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { aiProviders } from '../schema';
import { encrypt, isEncrypted, maskApiKey } from '../engine/encryption';
import { providerRegistry } from '../engine/provider-registry';

function maskProviderRow(row: any) {
  return {
    ...row,
    apiKeyEncrypted: maskApiKey(row.apiKeyEncrypted),
    hasApiKey: !!row.apiKeyEncrypted,
  };
}

// GET /api/ai-providers/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.id, parseInt(id, 10)));

  if (!result) return notFound('AI provider not found');
  return NextResponse.json(maskProviderRow(result));
}

// PUT /api/ai-providers/[id] — encrypts API key if changed
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;
  const body = await request.json();

  // Strip read-only and computed fields that React Admin sends back
  delete body.id;
  delete body.createdAt;
  delete body.updatedAt;
  delete body.hasApiKey;

  // Encrypt the API key if provided and not already encrypted
  // Skip if the value is the masked form (user didn't change it)
  if (body.apiKeyEncrypted) {
    const isMasked = body.apiKeyEncrypted.startsWith('••') || body.apiKeyEncrypted.includes('...');
    if (!isMasked && !isEncrypted(body.apiKeyEncrypted)) {
      body.apiKeyEncrypted = encrypt(body.apiKeyEncrypted);
    } else if (isMasked) {
      // User didn't change the key — remove from update to preserve existing
      delete body.apiKeyEncrypted;
    }
  }

  const [result] = await db
    .update(aiProviders)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(aiProviders.id, parseInt(id, 10)))
    .returning();

  if (!result) return notFound('AI provider not found');

  // Clear provider cache so next resolve picks up updated key
  providerRegistry.clearCache();

  eventBus.emit('ai.provider.updated', {
    id: result.id,
    tenantId: result.tenantId,
    name: result.name,
    slug: result.slug,
    type: result.type,
  });

  return NextResponse.json(maskProviderRow(result));
}

// DELETE /api/ai-providers/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(aiProviders)
    .where(eq(aiProviders.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('AI provider not found');

  // Clear cache
  providerRegistry.clearCache();

  eventBus.emit('ai.provider.deleted', {
    id: deleted.id,
    tenantId: deleted.tenantId,
    slug: deleted.slug,
  });

  return NextResponse.json({ id: deleted.id, slug: deleted.slug });
}
