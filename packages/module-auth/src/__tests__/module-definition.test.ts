import { describe, it, expect } from 'vitest';
import { authModule } from '../index';

describe('module-auth ModuleDefinition wiring', () => {
  it('has name "auth"', () => {
    expect(authModule.name).toBe('auth');
  });

  it('depends on roles', () => {
    expect(authModule.dependencies).toContain('roles');
  });

  describe('apiHandlers', () => {
    const handlers = authModule.apiHandlers;

    it('defines handlers for all auth routes', () => {
      const expected = [
        'auth/login',
        'auth/register',
        'auth/logout',
        'auth/me',
        'auth/refresh',
        'auth/forgot-password',
        'auth/reset-password',
        'api-keys',
        'api-keys/[id]',
        'auth-sessions',
        'auth-sessions/[id]',
        'users',
        'users/[id]',
      ];
      for (const route of expected) {
        expect(handlers).toHaveProperty(route);
      }
    });

    it('every handler value is a function', () => {
      for (const [, methods] of Object.entries(handlers)) {
        for (const [, fn] of Object.entries(methods as Record<string, unknown>)) {
          expect(typeof fn).toBe('function');
        }
      }
    });
  });

  describe('events', () => {
    it('every emitted event has a matching schema', () => {
      const events = authModule.events!;
      for (const name of events.emits!) {
        expect(events.schemas).toHaveProperty(name);
      }
    });
  });

  describe('chat.actionSchemas', () => {
    it('every action endpoint path maps to apiHandlers', () => {
      const handlerKeys = Object.keys(authModule.apiHandlers);
      for (const action of authModule.chat!.actionSchemas!) {
        expect(handlerKeys).toContain(action.endpoint.path);
      }
    });
  });

  describe('configSchema', () => {
    it('has at least 3 config keys', () => {
      expect(authModule.configSchema!.length).toBeGreaterThanOrEqual(3);
    });

    it('JWT_ACCESS_TOKEN_EXPIRY defaults to a number', () => {
      const entry = authModule.configSchema!.find((c: any) => c.key === 'JWT_ACCESS_TOKEN_EXPIRY');
      expect(entry).toBeDefined();
      expect(typeof entry!.defaultValue).toBe('number');
    });
  });
});
