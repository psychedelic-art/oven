// Idempotent seed for @oven/module-notifications.
//
// - Inserts permissions for notifications.* resources.
// - Marks the WhatsApp webhook routes as public in api_endpoint_permissions.
//
// Matches the shape used by packages/module-tenants/src/seed.ts: the
// module consumes tables by name via the db object passed in from the
// registry bootstrap, not by direct Drizzle table imports. This keeps
// the seed function decoupled from whichever module owns those tables
// (module-roles for permissions, module-auth for api_endpoint_permissions).

type SeedDb = {
  insert: (table: unknown) => {
    values: (values: unknown) => {
      onConflictDoNothing: () => Promise<unknown>;
    };
  };
};

type PermissionsTableRef = { tableName: 'permissions' };
type ApiEndpointPermissionsTableRef = { tableName: 'api_endpoint_permissions' };

export interface SeedNotificationsTables {
  permissions: unknown;
  apiEndpointPermissions: unknown;
}

export interface SeedNotificationsOptions {
  /**
   * Test hook — accepts a mocked tables object so tests can assert
   * which rows were inserted without wiring the full composed schema.
   * In production the registry supplies the real Drizzle tables.
   */
  tables?: SeedNotificationsTables;
}

const MODULE_PERMISSIONS = [
  {
    resource: 'notification-channels',
    action: 'read',
    slug: 'notification-channels.read',
    description: 'View notification channels',
  },
  {
    resource: 'notification-channels',
    action: 'create',
    slug: 'notification-channels.create',
    description: 'Create notification channels',
  },
  {
    resource: 'notification-channels',
    action: 'update',
    slug: 'notification-channels.update',
    description: 'Edit notification channels',
  },
  {
    resource: 'notification-channels',
    action: 'delete',
    slug: 'notification-channels.delete',
    description: 'Delete notification channels',
  },
  {
    resource: 'notification-conversations',
    action: 'read',
    slug: 'notification-conversations.read',
    description: 'View notification conversations',
  },
  {
    resource: 'notification-escalations',
    action: 'read',
    slug: 'notification-escalations.read',
    description: 'View notification escalations',
  },
  {
    resource: 'notification-escalations',
    action: 'resolve',
    slug: 'notification-escalations.resolve',
    description: 'Resolve notification escalations',
  },
  {
    resource: 'notification-usage',
    action: 'read',
    slug: 'notification-usage.read',
    description: 'View notification usage reports',
  },
] as const;

const PUBLIC_ENDPOINTS = [
  {
    module: 'notifications',
    route: 'notifications/whatsapp/webhook',
    method: 'GET',
    isPublic: true,
  },
  {
    module: 'notifications',
    route: 'notifications/whatsapp/webhook',
    method: 'POST',
    isPublic: true,
  },
] as const;

export const seedNotificationsPermissions = MODULE_PERMISSIONS;
export const seedNotificationsPublicEndpoints = PUBLIC_ENDPOINTS;

/**
 * Seed module permissions + public endpoints. Idempotent via
 * ON CONFLICT DO NOTHING, matching Rule 12.1.
 *
 * The tables are looked up on the `db` object provided by the
 * registry bootstrap. At the time this module seeds, module-roles has
 * already registered the `permissions` table and module-auth has
 * already registered `api_endpoint_permissions`.
 */
export async function seedNotifications(
  db: SeedDb & Record<string, unknown>,
  options: SeedNotificationsOptions = {}
): Promise<void> {
  const permissionsTable =
    options.tables?.permissions ??
    (db.permissions as PermissionsTableRef | undefined) ??
    { tableName: 'permissions' };
  const apiEndpointPermissionsTable =
    options.tables?.apiEndpointPermissions ??
    (db.apiEndpointPermissions as ApiEndpointPermissionsTableRef | undefined) ??
    { tableName: 'api_endpoint_permissions' };

  for (const perm of MODULE_PERMISSIONS) {
    await db.insert(permissionsTable).values(perm).onConflictDoNothing();
  }

  for (const ep of PUBLIC_ENDPOINTS) {
    await db.insert(apiEndpointPermissionsTable).values(ep).onConflictDoNothing();
  }
}
