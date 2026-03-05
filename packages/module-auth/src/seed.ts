import { permissions } from '@oven/module-roles/schema';

export async function seedAuth(db: any): Promise<void> {
  // ─── Permissions ─────────────────────────────────────────────────
  const modulePermissions = [
    { resource: 'users', action: 'read', slug: 'users.read', description: 'View users' },
    { resource: 'users', action: 'create', slug: 'users.create', description: 'Create users' },
    { resource: 'users', action: 'update', slug: 'users.update', description: 'Edit users' },
    { resource: 'users', action: 'delete', slug: 'users.delete', description: 'Delete users' },
    { resource: 'api-keys', action: 'read', slug: 'api-keys.read', description: 'View API keys' },
    { resource: 'api-keys', action: 'create', slug: 'api-keys.create', description: 'Create API keys' },
    { resource: 'api-keys', action: 'delete', slug: 'api-keys.delete', description: 'Revoke API keys' },
    { resource: 'auth-sessions', action: 'read', slug: 'auth-sessions.read', description: 'View auth sessions' },
    { resource: 'auth-sessions', action: 'delete', slug: 'auth-sessions.delete', description: 'Revoke auth sessions' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // ─── Public Endpoints ────────────────────────────────────────────
  // These endpoints are publicly accessible without authentication.
  // Logged here for documentation; actual apiEndpointPermissions
  // table seeding is deferred until the table is guaranteed to exist.
  const publicEndpoints = [
    { module: 'auth', route: 'auth/login', method: 'POST' },
    { module: 'auth', route: 'auth/register', method: 'POST' },
    { module: 'auth', route: 'auth/refresh', method: 'POST' },
    { module: 'auth', route: 'auth/forgot-password', method: 'POST' },
    { module: 'auth', route: 'auth/reset-password', method: 'POST' },
  ];

  console.log('[module-auth] Public endpoints (logged for reference):');
  for (const ep of publicEndpoints) {
    console.log(`  ${ep.method} /api/${ep.route}`);
  }

  console.log(`[module-auth] Seeded ${modulePermissions.length} auth permissions`);
}
