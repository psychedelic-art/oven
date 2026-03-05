import { permissions } from '@oven/module-roles/schema';

export async function seedUiFlows(db: any): Promise<void> {
  const modulePermissions = [
    { resource: 'ui-flows', action: 'read', slug: 'ui-flows.read', description: 'View UI flow portals' },
    { resource: 'ui-flows', action: 'create', slug: 'ui-flows.create', description: 'Create UI flow portals' },
    { resource: 'ui-flows', action: 'update', slug: 'ui-flows.update', description: 'Edit UI flow portals' },
    { resource: 'ui-flows', action: 'delete', slug: 'ui-flows.delete', description: 'Delete UI flow portals' },
    { resource: 'ui-flows', action: 'publish', slug: 'ui-flows.publish', description: 'Publish UI flow portals' },
    { resource: 'ui-flow-analytics', action: 'read', slug: 'ui-flow-analytics.read', description: 'View portal analytics' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  console.log('[module-ui-flows] Seeded 6 ui-flows permissions');
}
