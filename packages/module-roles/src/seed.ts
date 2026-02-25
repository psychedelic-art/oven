import { eq } from 'drizzle-orm';
import { roles, permissions, rolePermissions } from './schema';

const DEFAULT_ROLES = [
  { name: 'Admin', slug: 'admin', description: 'Full system access', isSystem: true },
  { name: 'Moderator', slug: 'moderator', description: 'Player and session management', isSystem: true },
  { name: 'Player', slug: 'player', description: 'Basic game access', isSystem: false },
];

const RESOURCES = ['players', 'maps', 'sessions', 'tiles', 'world-configs', 'map-assignments', 'workflows', 'roles', 'permissions', 'rls-policies'];
const ACTIONS = ['create', 'read', 'update', 'delete'];

// Which permissions each role gets
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: ['*'], // All permissions
  moderator: [
    'players.*',
    'sessions.*',
    'map-assignments.*',
    'maps.read',
    'tiles.read',
    'world-configs.read',
    'workflows.read',
  ],
  player: [
    'players.read',
    'maps.read',
    'sessions.read',
    'tiles.read',
    'world-configs.read',
  ],
};

export async function seed(db: any) {
  // Seed permissions
  const allPermissions: Array<{ resource: string; action: string; slug: string; description: string }> = [];
  for (const resource of RESOURCES) {
    for (const action of ACTIONS) {
      allPermissions.push({
        resource,
        action,
        slug: `${resource}.${action}`,
        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
      });
    }
  }

  for (const perm of allPermissions) {
    const existing = await db.select().from(permissions).where(eq(permissions.slug, perm.slug));
    if (existing.length === 0) {
      await db.insert(permissions).values(perm);
    }
  }

  // Seed roles
  for (const role of DEFAULT_ROLES) {
    const existing = await db.select().from(roles).where(eq(roles.slug, role.slug));
    if (existing.length === 0) {
      await db.insert(roles).values(role);
    }
  }

  // Seed role-permission mappings
  const allDbRoles = await db.select().from(roles);
  const allDbPerms = await db.select().from(permissions);

  for (const role of allDbRoles) {
    const patterns = ROLE_PERMISSION_MAP[role.slug];
    if (!patterns) continue;

    for (const perm of allDbPerms) {
      const shouldAssign = patterns.some((pattern) => {
        if (pattern === '*') return true;
        if (pattern.endsWith('.*')) {
          return perm.resource === pattern.replace('.*', '');
        }
        return perm.slug === pattern;
      });

      if (shouldAssign) {
        const existing = await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, role.id));
        const alreadyMapped = existing.some(
          (rp: any) => rp.permissionId === perm.id
        );
        if (!alreadyMapped) {
          await db.insert(rolePermissions).values({
            roleId: role.id,
            permissionId: perm.id,
          });
        }
      }
    }
  }
}
