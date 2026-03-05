import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { apiKeys } from '../schema';

// DELETE /api/api-keys/[id] — Revoke (delete) an API key
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDb();
  const { id } = await params;

  const [deleted] = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, parseInt(id, 10)))
    .returning();

  if (!deleted) return notFound('API key not found');

  eventBus.emit('auth.apiKey.revoked', {
    id: deleted.id,
    name: deleted.name,
    keyPrefix: deleted.keyPrefix,
    tenantId: deleted.tenantId,
    userId: deleted.userId,
  });

  return NextResponse.json(deleted);
}
