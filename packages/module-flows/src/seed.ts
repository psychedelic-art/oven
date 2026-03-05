import { permissions } from '@oven/module-roles/schema';

export async function seedFlows(db: any): Promise<void> {
  const modulePermissions = [
    { resource: 'flows', action: 'read', slug: 'flows.read', description: 'View flow templates' },
    { resource: 'flows', action: 'create', slug: 'flows.create', description: 'Create flow templates' },
    { resource: 'flows', action: 'update', slug: 'flows.update', description: 'Edit flow templates' },
    { resource: 'flows', action: 'delete', slug: 'flows.delete', description: 'Delete flow templates' },
    { resource: 'flow-items', action: 'read', slug: 'flow-items.read', description: 'View flow items' },
    { resource: 'flow-items', action: 'create', slug: 'flow-items.create', description: 'Create flow items' },
    { resource: 'flow-items', action: 'update', slug: 'flow-items.update', description: 'Edit flow items' },
    { resource: 'flow-items', action: 'transition', slug: 'flow-items.transition', description: 'Transition flow items between stages' },
    { resource: 'flow-comments', action: 'create', slug: 'flow-comments.create', description: 'Add comments to flow items' },
    { resource: 'flow-reviews', action: 'create', slug: 'flow-reviews.create', description: 'Submit reviews for flow items' },
    { resource: 'flow-reviews', action: 'read', slug: 'flow-reviews.read', description: 'View reviews' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  console.log('[module-flows] Seeded 11 flow permissions');
}
