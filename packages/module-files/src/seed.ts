import { getDb } from '@oven/module-registry/db';
import { permissions } from '@oven/module-roles/schema';

export async function seedFiles() {
  const db = getDb();

  // ─── Permissions ────────────────────────────────────────────

  const modulePermissions = [
    { resource: 'files', action: 'read', slug: 'files.read', description: 'View files' },
    { resource: 'files', action: 'create', slug: 'files.create', description: 'Upload files' },
    { resource: 'files', action: 'delete', slug: 'files.delete', description: 'Delete files' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing({ target: permissions.slug });
  }
}
