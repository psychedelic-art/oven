import { permissions } from '@oven/module-roles/schema';

export async function seedForms(db: any): Promise<void> {
  const modulePermissions = [
    { resource: 'forms', action: 'read', slug: 'forms.read', description: 'View forms' },
    { resource: 'forms', action: 'create', slug: 'forms.create', description: 'Create forms' },
    { resource: 'forms', action: 'update', slug: 'forms.update', description: 'Edit forms' },
    { resource: 'forms', action: 'delete', slug: 'forms.delete', description: 'Delete forms' },
    { resource: 'forms', action: 'publish', slug: 'forms.publish', description: 'Publish forms' },
    { resource: 'form-submissions', action: 'read', slug: 'form-submissions.read', description: 'View submissions' },
    { resource: 'form-submissions', action: 'create', slug: 'form-submissions.create', description: 'Submit forms' },
    { resource: 'form-components', action: 'read', slug: 'form-components.read', description: 'View components' },
    { resource: 'form-components', action: 'create', slug: 'form-components.create', description: 'Register components' },
    { resource: 'form-components', action: 'update', slug: 'form-components.update', description: 'Edit components' },
    { resource: 'form-components', action: 'delete', slug: 'form-components.delete', description: 'Delete components' },
    { resource: 'form-data-sources', action: 'read', slug: 'form-data-sources.read', description: 'View data sources' },
    { resource: 'form-data-sources', action: 'create', slug: 'form-data-sources.create', description: 'Create data sources' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  console.log('[module-forms] Seeded 13 forms permissions');
}
