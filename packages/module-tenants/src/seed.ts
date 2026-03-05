import { permissions } from '@oven/module-roles/schema';

export async function seedTenants(db: any): Promise<void> {
  const modulePermissions = [
    { resource: 'tenants', action: 'read', slug: 'tenants.read', description: 'View tenants' },
    { resource: 'tenants', action: 'create', slug: 'tenants.create', description: 'Create tenants' },
    { resource: 'tenants', action: 'update', slug: 'tenants.update', description: 'Edit tenants' },
    { resource: 'tenants', action: 'delete', slug: 'tenants.delete', description: 'Delete tenants' },
    { resource: 'tenant-members', action: 'read', slug: 'tenant-members.read', description: 'View tenant members' },
    { resource: 'tenant-members', action: 'create', slug: 'tenant-members.create', description: 'Add tenant members' },
    { resource: 'tenant-members', action: 'delete', slug: 'tenant-members.delete', description: 'Remove tenant members' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  console.log('[module-tenants] Seeded 7 tenant permissions');
}
