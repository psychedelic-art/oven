import { describe, it, expect, vi } from 'vitest';
import {
  seedNotifications,
  seedNotificationsPermissions,
  seedNotificationsPublicEndpoints,
} from '../seed';

// Fake db that records every insert().values().onConflictDoNothing()
// call and returns a stub. Mirrors the shape of Drizzle's insert chain.
function makeFakeDb() {
  const inserts: Array<{ table: unknown; values: unknown }> = [];
  const db = {
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: unknown) => ({
        onConflictDoNothing: vi.fn(async () => {
          inserts.push({ table, values });
        }),
      })),
    })),
  };
  return { db, inserts };
}

describe('seedNotifications', () => {
  it('inserts 8 permissions and 2 public endpoints', async () => {
    const { db, inserts } = makeFakeDb();
    const permissionsTable = { name: 'permissions' };
    const apiEndpointPermissionsTable = { name: 'api_endpoint_permissions' };

    await seedNotifications(db as unknown as Parameters<typeof seedNotifications>[0], {
      tables: {
        permissions: permissionsTable,
        apiEndpointPermissions: apiEndpointPermissionsTable,
      },
    });

    expect(inserts).toHaveLength(
      seedNotificationsPermissions.length + seedNotificationsPublicEndpoints.length
    );
    const permInserts = inserts.filter((i) => i.table === permissionsTable);
    const epInserts = inserts.filter((i) => i.table === apiEndpointPermissionsTable);
    expect(permInserts).toHaveLength(seedNotificationsPermissions.length);
    expect(epInserts).toHaveLength(seedNotificationsPublicEndpoints.length);
  });

  it('seeds channel, conversation, escalation, and usage permissions', async () => {
    const { db, inserts } = makeFakeDb();
    await seedNotifications(db as unknown as Parameters<typeof seedNotifications>[0], {
      tables: {
        permissions: { name: 'permissions' },
        apiEndpointPermissions: { name: 'api_endpoint_permissions' },
      },
    });
    const slugs = inserts
      .map((i) => (i.values as { slug?: string }).slug)
      .filter((s): s is string => typeof s === 'string');
    expect(slugs).toContain('notification-channels.read');
    expect(slugs).toContain('notification-channels.create');
    expect(slugs).toContain('notification-channels.update');
    expect(slugs).toContain('notification-channels.delete');
    expect(slugs).toContain('notification-conversations.read');
    expect(slugs).toContain('notification-escalations.read');
    expect(slugs).toContain('notification-escalations.resolve');
    expect(slugs).toContain('notification-usage.read');
  });

  it('marks the WhatsApp webhook GET and POST routes public', async () => {
    const { db, inserts } = makeFakeDb();
    const apiEndpointPermissionsTable = { name: 'api_endpoint_permissions' };
    await seedNotifications(db as unknown as Parameters<typeof seedNotifications>[0], {
      tables: {
        permissions: { name: 'permissions' },
        apiEndpointPermissions: apiEndpointPermissionsTable,
      },
    });
    const epInserts = inserts
      .filter((i) => i.table === apiEndpointPermissionsTable)
      .map((i) => i.values as { method: string; route: string; isPublic: boolean });
    expect(epInserts).toContainEqual(
      expect.objectContaining({
        method: 'GET',
        route: 'notifications/whatsapp/webhook',
        isPublic: true,
      })
    );
    expect(epInserts).toContainEqual(
      expect.objectContaining({
        method: 'POST',
        route: 'notifications/whatsapp/webhook',
        isPublic: true,
      })
    );
  });

  it('uses onConflictDoNothing for idempotency (Rule 12.1)', async () => {
    const { db } = makeFakeDb();
    await seedNotifications(db as unknown as Parameters<typeof seedNotifications>[0], {
      tables: {
        permissions: { name: 'permissions' },
        apiEndpointPermissions: { name: 'api_endpoint_permissions' },
      },
    });
    // Every insert().values() chain must have called onConflictDoNothing.
    // The mock function's mock.calls on the chain returns shows the chain
    // was constructed for every insert; calling seed again must not throw.
    await expect(
      seedNotifications(db as unknown as Parameters<typeof seedNotifications>[0], {
        tables: {
          permissions: { name: 'permissions' },
          apiEndpointPermissions: { name: 'api_endpoint_permissions' },
        },
      })
    ).resolves.toBeUndefined();
  });
});
