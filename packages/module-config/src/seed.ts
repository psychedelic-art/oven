import { permissions } from '@oven/module-roles/schema';

export async function seedConfig(db: any): Promise<void> {
  const modulePermissions = [
    { resource: 'module-configs', action: 'read', slug: 'module-configs.read', description: 'View config entries' },
    { resource: 'module-configs', action: 'create', slug: 'module-configs.create', description: 'Create config entries' },
    { resource: 'module-configs', action: 'update', slug: 'module-configs.update', description: 'Edit config entries' },
    { resource: 'module-configs', action: 'delete', slug: 'module-configs.delete', description: 'Delete config entries' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  console.log('[module-config] Seeded 4 config permissions');
}
