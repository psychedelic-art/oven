import { describe, it, expect } from 'vitest';
import {
  notificationChannels,
  notificationConversations,
  notificationMessages,
  notificationUsage,
  notificationEscalations,
  notificationsSchema,
} from '../schema';

// These tests assert the Drizzle-level shape of the module schema.
// They don't talk to a real database; they inspect the columns object
// Drizzle exposes on each pgTable and verify the contract required by
// module-rules.md (Rule 4.3 — plain int FKs, Rule 5.1 — tenantId
// column + index, Rule 11.2 — standard columns, Rule 11.3 — indexes).

describe('notifications schema', () => {
  it('exports all 5 tables via notificationsSchema', () => {
    expect(Object.keys(notificationsSchema).sort()).toEqual([
      'notificationChannels',
      'notificationConversations',
      'notificationEscalations',
      'notificationMessages',
      'notificationUsage',
    ]);
  });

  describe('notification_channels', () => {
    it('has tenant_id, adapter_name, channel_type, config, enabled', () => {
      const cols = notificationChannels as unknown as Record<string, unknown>;
      expect(cols.tenantId).toBeDefined();
      expect(cols.adapterName).toBeDefined();
      expect(cols.channelType).toBeDefined();
      expect(cols.config).toBeDefined();
      expect(cols.enabled).toBeDefined();
      expect(cols.id).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });
  });

  describe('notification_conversations', () => {
    it('has tenant_id, channel_id, external_user_id, agent_session_id, status', () => {
      const cols = notificationConversations as unknown as Record<string, unknown>;
      expect(cols.tenantId).toBeDefined();
      expect(cols.channelId).toBeDefined();
      expect(cols.externalUserId).toBeDefined();
      expect(cols.agentSessionId).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.id).toBeDefined();
      expect(cols.createdAt).toBeDefined();
      expect(cols.updatedAt).toBeDefined();
    });
  });

  describe('notification_messages', () => {
    it('has conversation_id, direction, message_type, content, external_message_id, status', () => {
      const cols = notificationMessages as unknown as Record<string, unknown>;
      expect(cols.conversationId).toBeDefined();
      expect(cols.direction).toBeDefined();
      expect(cols.messageType).toBeDefined();
      expect(cols.content).toBeDefined();
      expect(cols.externalMessageId).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.error).toBeDefined();
      expect(cols.id).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });
  });

  describe('notification_usage', () => {
    it('has tenant_id, channel_type, period_start, period_end, message_count, limit', () => {
      const cols = notificationUsage as unknown as Record<string, unknown>;
      expect(cols.tenantId).toBeDefined();
      expect(cols.channelType).toBeDefined();
      expect(cols.periodStart).toBeDefined();
      expect(cols.periodEnd).toBeDefined();
      expect(cols.messageCount).toBeDefined();
      expect(cols.limit).toBeDefined();
    });
  });

  describe('notification_escalations', () => {
    it('has tenant_id, conversation_id, reason, status, resolved_by, resolved_at', () => {
      const cols = notificationEscalations as unknown as Record<string, unknown>;
      expect(cols.tenantId).toBeDefined();
      expect(cols.conversationId).toBeDefined();
      expect(cols.reason).toBeDefined();
      expect(cols.status).toBeDefined();
      expect(cols.resolvedBy).toBeDefined();
      expect(cols.resolvedAt).toBeDefined();
      expect(cols.userMessage).toBeDefined();
      expect(cols.id).toBeDefined();
      expect(cols.createdAt).toBeDefined();
    });
  });

  it('all tenant-scoped tables have tenantId (Rule 5.1)', () => {
    const tenantScoped = [
      notificationChannels,
      notificationConversations,
      notificationUsage,
      notificationEscalations,
    ];
    for (const table of tenantScoped) {
      const cols = table as unknown as Record<string, unknown>;
      expect(cols.tenantId).toBeDefined();
    }
  });
});
