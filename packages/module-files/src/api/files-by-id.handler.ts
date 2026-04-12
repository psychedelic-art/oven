import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@oven/module-registry/db';
import { notFound } from '@oven/module-registry/api-utils';
import { eventBus } from '@oven/module-registry';
import { getTenantIdsFromRequest } from '@oven/module-auth/auth-utils';
import { files } from '../schema';
import { getStorageAdapter } from '../engine/storage-adapter';

// GET /api/files/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb();
  const { id } = await params;
  const [result] = await db
    .select()
    .from(files)
    .where(eq(files.id, parseInt(id, 10)));

  if (!result) return notFound('File not found');

  // Tenant scoping: return 404 (not 403) for cross-tenant access
  if (result.tenantId != null) {
    const callerTenantIds = await getTenantIdsFromRequest(request);
    if (!callerTenantIds.includes(result.tenantId)) {
      return notFound('File not found');
    }
  }

  return NextResponse.json(result);
}

// DELETE /api/files/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getDb();
  const { id } = await params;

  const [record] = await db
    .select()
    .from(files)
    .where(eq(files.id, parseInt(id, 10)));

  if (!record) return notFound('File not found');

  // Tenant scoping: return 404 (not 403) for cross-tenant access
  if (record.tenantId != null) {
    const callerTenantIds = await getTenantIdsFromRequest(request);
    if (!callerTenantIds.includes(record.tenantId)) {
      return notFound('File not found');
    }
  }

  // Delete from storage — log and continue on failure
  try {
    const adapter = await getStorageAdapter();
    await adapter.delete(record.publicUrl);
  } catch {
    // Storage deletion may fail if file was already removed — proceed with DB cleanup
  }

  const [deleted] = await db
    .delete(files)
    .where(eq(files.id, parseInt(id, 10)))
    .returning();

  eventBus.emit('files.file.deleted', {
    id: deleted.id,
    tenantId: deleted.tenantId,
    filename: deleted.filename,
    publicUrl: deleted.publicUrl,
    storageKey: deleted.storageKey,
    folder: deleted.folder,
    sourceModule: deleted.sourceModule,
    sourceId: deleted.sourceId,
  });

  return NextResponse.json(deleted);
}
