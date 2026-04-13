import { describe, it, expect } from 'vitest';
import { notificationsModule } from '../index';

// These tests enforce the invariants described in
// docs/modules/todo/notifications/sprint-01-foundation.md Acceptance
// Criteria and in module-rules.md rules 1, 2, 5.6, 8, 13.

describe('notificationsModule', () => {
  it('has name "notifications"', () => {
    expect(notificationsModule.name).toBe('notifications');
  });

  it('declares dependencies config, tenants, agent-core', () => {
    expect(notificationsModule.dependencies).toEqual([
      'config',
      'tenants',
      'agent-core',
    ]);
  });

  it('includes all 5 tables in schema', () => {
    const keys = Object.keys(notificationsModule.schema).sort();
    expect(keys).toEqual([
      'notificationChannels',
      'notificationConversations',
      'notificationEscalations',
      'notificationMessages',
      'notificationUsage',
    ]);
  });

  it('has apiHandlers with channel, conversation, and webhook routes', () => {
    const keys = Object.keys(notificationsModule.apiHandlers ?? {}).sort();
    expect(keys).toEqual([
      'notification-channels',
      'notification-channels/[id]',
      'notification-conversations',
      'notification-conversations/[id]',
      'notifications/usage',
      'notifications/whatsapp/webhook',
    ]);
  });

  it('has 3 dashboard resources (sprint-04 shipped)', () => {
    const names = (notificationsModule.resources ?? []).map((r: { name: string }) => r.name);
    expect(names).toEqual([
      'notification-channels',
      'notification-conversations',
      'notification-escalations',
    ]);
  });

  describe('configSchema', () => {
    it('declares the 4 spec-defined keys + 3 DEFAULT_*_LIMIT keys', () => {
      const keys = (notificationsModule.configSchema ?? []).map((e) => e.key).sort();
      expect(keys).toEqual([
        'AUTO_CLOSE_CONVERSATION_HOURS',
        'DEFAULT_EMAIL_LIMIT',
        'DEFAULT_SMS_LIMIT',
        'DEFAULT_WHATSAPP_LIMIT',
        'ESCALATION_NOTIFY_OFFICE',
        'USAGE_WARNING_THRESHOLD',
        'WHATSAPP_API_VERSION',
      ]);
    });

    it('every entry has type, description, and defaultValue', () => {
      for (const entry of notificationsModule.configSchema ?? []) {
        expect(entry.key).toBeTruthy();
        expect(['number', 'string', 'boolean', 'object', 'array']).toContain(entry.type);
        expect(entry.description).toBeTruthy();
        // defaultValue may be 0 / false / ''; check it's explicitly present.
        expect(entry).toHaveProperty('defaultValue');
      }
    });

    it('DEFAULT_WHATSAPP_LIMIT defaults to 300', () => {
      const entry = notificationsModule.configSchema?.find(
        (e) => e.key === 'DEFAULT_WHATSAPP_LIMIT'
      );
      expect(entry?.defaultValue).toBe(300);
    });

    it('USAGE_WARNING_THRESHOLD defaults to 80', () => {
      const entry = notificationsModule.configSchema?.find(
        (e) => e.key === 'USAGE_WARNING_THRESHOLD'
      );
      expect(entry?.defaultValue).toBe(80);
    });
  });

  describe('events', () => {
    it('emits exactly 8 event names', () => {
      expect(notificationsModule.events?.emits?.length).toBe(8);
    });

    it('every emitted event has a matching schema (Rule 2.3)', () => {
      const emits = notificationsModule.events?.emits ?? [];
      const schemas = notificationsModule.events?.schemas ?? {};
      for (const name of emits) {
        expect(schemas[name]).toBeDefined();
      }
    });

    it('every event schema includes tenantId (Rule 5.6)', () => {
      const schemas = notificationsModule.events?.schemas ?? {};
      for (const [name, payload] of Object.entries(schemas)) {
        expect(payload.tenantId, `event ${name} must include tenantId`).toBeDefined();
      }
    });
  });

  describe('chat block', () => {
    // The chat block is not yet on the ModuleDefinition type; access
    // via an untyped property read mirrors the pattern used by
    // module-ai / module-tenants until module-registry is updated.
    const chat = (notificationsModule as unknown as { chat?: Record<string, unknown> }).chat;

    it('declares description, capabilities, actionSchemas (Rule 2.1)', () => {
      expect(chat).toBeDefined();
      expect((chat as { description?: string }).description).toBeTruthy();
      expect(Array.isArray((chat as { capabilities?: string[] }).capabilities)).toBe(true);
      expect(
        Array.isArray((chat as { actionSchemas?: unknown[] }).actionSchemas)
      ).toBe(true);
    });

    it('exposes the four canonical actions', () => {
      const actions = (chat as { actionSchemas: Array<{ name: string }> }).actionSchemas;
      const names = actions.map((a) => a.name).sort();
      expect(names).toEqual([
        'notifications.checkLimit',
        'notifications.getUsage',
        'notifications.listConversations',
        'notifications.listEscalations',
      ]);
    });

    it('every REST-backed action has endpoint.method + endpoint.path', () => {
      const actions = (chat as {
        actionSchemas: Array<{ name: string; endpoint?: { method: string; path: string } }>;
      }).actionSchemas;
      // notifications.checkLimit is an in-process action without a REST endpoint.
      for (const action of actions) {
        if (action.name === 'notifications.checkLimit') continue;
        expect(action.endpoint?.method).toBeTruthy();
        expect(action.endpoint?.path).toBeTruthy();
      }
    });
  });
});
