import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerNotificationAdapter,
  getAdapter,
  getAdapterForChannelType,
  listAdapters,
  clearAdapters,
} from '../adapters/registry';
import type { NotificationAdapter } from '../types';

function makeAdapter(
  name: string,
  channelType: 'whatsapp' | 'sms' | 'email' = 'whatsapp'
): NotificationAdapter {
  return {
    name,
    channelType,
    async sendMessage() {
      return { externalMessageId: 'x', status: 'sent' };
    },
    async parseInboundWebhook() {
      return {
        from: '573001234567',
        content: { type: 'text', text: 'hi' },
        externalMessageId: 'x',
        timestamp: new Date(),
      };
    },
    async verifyWebhookSignature() {
      return true;
    },
  };
}

describe('adapter registry', () => {
  beforeEach(() => {
    clearAdapters();
  });

  it('starts empty', () => {
    expect(listAdapters()).toEqual([]);
    expect(getAdapter('meta')).toBeNull();
  });

  it('registers and retrieves an adapter by name', () => {
    const meta = makeAdapter('meta');
    registerNotificationAdapter(meta);
    expect(getAdapter('meta')).toBe(meta);
  });

  it('returns null for unknown adapter names', () => {
    expect(getAdapter('does-not-exist')).toBeNull();
  });

  it('rejects duplicate registration with the same name', () => {
    registerNotificationAdapter(makeAdapter('meta'));
    expect(() => registerNotificationAdapter(makeAdapter('meta'))).toThrow(
      /already registered/
    );
  });

  it('rejects adapters with missing or empty name', () => {
    expect(() =>
      registerNotificationAdapter({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    ).toThrow(/name is required/);
    expect(() =>
      registerNotificationAdapter({
        name: '',
        channelType: 'whatsapp',
        sendMessage: async () => ({ externalMessageId: 'x', status: 'sent' }),
        parseInboundWebhook: async () => ({
          from: 'x',
          content: { type: 'text' },
          externalMessageId: 'x',
          timestamp: new Date(),
        }),
        verifyWebhookSignature: async () => false,
      })
    ).toThrow(/name is required/);
  });

  it('getAdapterForChannelType returns the first adapter of that channel', () => {
    const meta = makeAdapter('meta', 'whatsapp');
    const twilio = makeAdapter('twilio', 'sms');
    registerNotificationAdapter(meta);
    registerNotificationAdapter(twilio);
    expect(getAdapterForChannelType('whatsapp')).toBe(meta);
    expect(getAdapterForChannelType('sms')).toBe(twilio);
    expect(getAdapterForChannelType('email')).toBeNull();
  });

  it('listAdapters returns a frozen snapshot', () => {
    registerNotificationAdapter(makeAdapter('meta'));
    registerNotificationAdapter(makeAdapter('twilio', 'sms'));
    const snap = listAdapters();
    expect(snap.length).toBe(2);
    expect(Object.isFrozen(snap)).toBe(true);
  });

  it('clearAdapters removes all registrations', () => {
    registerNotificationAdapter(makeAdapter('meta'));
    clearAdapters();
    expect(listAdapters()).toEqual([]);
    expect(getAdapter('meta')).toBeNull();
  });
});
