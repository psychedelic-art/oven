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

  // ─── Sample UI Flow ──────────────────────────────────────────
  // Note: This uses raw SQL insert to avoid circular deps on uiFlows schema
  // The UI flow references the seeded forms from module-forms

  try {
    await db.execute({
      sql: `INSERT INTO ui_flows (tenant_id, name, slug, description, status, definition, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT DO NOTHING`,
      params: [
        1,
        'Dental Clinic Portal',
        'dental-clinic',
        'Sample dental clinic portal with landing page, contact form, and patient intake',
        'draft',
        JSON.stringify({
          pages: [
            {
              id: 'page-home',
              type: 'landing',
              title: 'Welcome',
              slug: '',
              config: {
                heroTitle: 'Welcome to Our Dental Clinic',
                heroSubtitle: 'Quality dental care for the whole family',
                ctaText: 'Book Appointment',
                ctaLink: '/patient-intake',
              },
              position: { x: 250, y: 50 },
            },
            {
              id: 'page-contact',
              type: 'form',
              title: 'Contact Us',
              slug: 'contact',
              formRef: 'contact-form',
              position: { x: 100, y: 250 },
            },
            {
              id: 'page-intake',
              type: 'form',
              title: 'Patient Registration',
              slug: 'patient-intake',
              formRef: 'patient-intake',
              position: { x: 400, y: 250 },
            },
          ],
          edges: [
            { id: 'e-home-contact', source: 'page-home', target: 'page-contact' },
            { id: 'e-home-intake', source: 'page-home', target: 'page-intake' },
          ],
          navigation: {
            type: 'sidebar',
            items: [
              { label: 'Home', slug: '', pageId: 'page-home' },
              { label: 'Contact', slug: 'contact', pageId: 'page-contact' },
              { label: 'Patient Registration', slug: 'patient-intake', pageId: 'page-intake' },
            ],
          },
          theme: {
            primaryColor: '#1976d2',
            fontFamily: 'Inter, sans-serif',
          },
        }),
      ],
    });
    console.log('[module-ui-flows] Seeded sample Dental Clinic portal');
  } catch {
    // Table may not exist yet or conflict — skip silently
    console.log('[module-ui-flows] Skipped sample UI flow seed (table may not exist)');
  }
}
