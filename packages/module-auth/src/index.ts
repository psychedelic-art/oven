import type { ModuleDefinition, EventSchemaMap } from '@oven/module-registry';
import { authSchema } from './schema';
import { seedAuth } from './seed';
import * as authLoginHandler from './api/auth-login.handler';
import * as authRegisterHandler from './api/auth-register.handler';
import * as authLogoutHandler from './api/auth-logout.handler';
import * as authMeHandler from './api/auth-me.handler';
import * as authRefreshHandler from './api/auth-refresh.handler';
import * as authForgotPasswordHandler from './api/auth-forgot-password.handler';
import * as authResetPasswordHandler from './api/auth-reset-password.handler';
import * as apiKeysHandler from './api/api-keys.handler';
import * as apiKeysByIdHandler from './api/api-keys-by-id.handler';
import * as sessionsHandler from './api/sessions.handler';
import * as sessionsByIdHandler from './api/sessions-by-id.handler';
import * as usersHandler from './api/users.handler';
import * as usersByIdHandler from './api/users-by-id.handler';

// ─── Event Schemas ───────────────────────────────────────────────
const eventSchemas: EventSchemaMap = {
  'auth.user.login': {
    userId: { type: 'number', description: 'User ID', required: true },
    email: { type: 'string', description: 'User email', required: true },
    method: { type: 'string', description: 'Login method (password, sso, api-key)' },
  },
  'auth.user.registered': {
    userId: { type: 'number', description: 'User ID', required: true },
    email: { type: 'string', description: 'User email', required: true },
    name: { type: 'string', description: 'User display name', required: true },
  },
  'auth.user.logout': {
    userId: { type: 'number', description: 'User ID', required: true },
    sessionId: { type: 'number', description: 'Session ID that was revoked' },
  },
  'auth.user.passwordReset': {
    userId: { type: 'number', description: 'User ID', required: true },
    email: { type: 'string', description: 'User email', required: true },
    token: { type: 'string', description: 'Raw reset token (for email delivery)' },
    expiresAt: { type: 'string', description: 'Token expiry ISO timestamp' },
  },
  'auth.user.passwordChanged': {
    userId: { type: 'number', description: 'User ID', required: true },
    method: { type: 'string', description: 'How the password was changed (reset-token, self-service)' },
  },
  'auth.apiKey.created': {
    id: { type: 'number', description: 'API key DB ID', required: true },
    name: { type: 'string', description: 'API key name', required: true },
    keyPrefix: { type: 'string', description: 'First 8 chars of the key' },
    tenantId: { type: 'number', description: 'Tenant ID (null for platform-global)' },
    userId: { type: 'number', description: 'User ID (null for service keys)' },
  },
  'auth.apiKey.revoked': {
    id: { type: 'number', description: 'API key DB ID', required: true },
    name: { type: 'string', description: 'API key name', required: true },
    keyPrefix: { type: 'string', description: 'First 8 chars of the key' },
    tenantId: { type: 'number', description: 'Tenant ID' },
    userId: { type: 'number', description: 'User ID' },
  },
  'auth.session.revoked': {
    sessionId: { type: 'number', description: 'Session ID', required: true },
    userId: { type: 'number', description: 'User ID', required: true },
  },
};

// ─── Module Definition ───────────────────────────────────────────
export const authModule: ModuleDefinition = {
  name: 'auth',
  dependencies: ['roles'],
  description:
    'Authentication and identity management with pluggable adapter architecture, session tracking, API key management, and password reset flows',
  capabilities: [
    'user registration and login',
    'session management with access and refresh tokens',
    'API key creation and verification',
    'password reset flow',
    'pluggable auth adapter architecture',
    'auth middleware for route protection',
  ],
  schema: authSchema,
  seed: seedAuth,
  resources: [
    {
      name: 'users',
      options: { label: 'Users' },
    },
    {
      name: 'api-keys',
      options: { label: 'API Keys' },
    },
    {
      name: 'auth-sessions',
      options: { label: 'Sessions' },
    },
  ],
  menuItems: [
    { label: 'Users', to: '/users' },
    { label: 'API Keys', to: '/api-keys' },
    { label: 'Sessions', to: '/auth-sessions' },
  ],
  apiHandlers: {
    'auth/login': { POST: authLoginHandler.POST },
    'auth/register': { POST: authRegisterHandler.POST },
    'auth/logout': { POST: authLogoutHandler.POST },
    'auth/me': { GET: authMeHandler.GET },
    'auth/refresh': { POST: authRefreshHandler.POST },
    'auth/forgot-password': { POST: authForgotPasswordHandler.POST },
    'auth/reset-password': { POST: authResetPasswordHandler.POST },
    'api-keys': { GET: apiKeysHandler.GET, POST: apiKeysHandler.POST },
    'api-keys/[id]': { DELETE: apiKeysByIdHandler.DELETE },
    'auth-sessions': { GET: sessionsHandler.GET },
    'auth-sessions/[id]': { DELETE: sessionsByIdHandler.DELETE },
    'users': { GET: usersHandler.GET, POST: usersHandler.POST },
    'users/[id]': {
      GET: usersByIdHandler.GET,
      PUT: usersByIdHandler.PUT,
      DELETE: usersByIdHandler.DELETE,
    },
  },
  configSchema: [
    {
      key: 'JWT_ACCESS_TOKEN_EXPIRY',
      type: 'number',
      description: 'Access token expiry in seconds',
      defaultValue: 3600,
      example: 3600,
    },
    {
      key: 'JWT_REFRESH_TOKEN_EXPIRY',
      type: 'number',
      description: 'Refresh token expiry in seconds',
      defaultValue: 604800,
      example: 604800,
    },
    {
      key: 'ALLOW_SELF_REGISTRATION',
      type: 'boolean',
      description: 'Whether users can self-register via the public register endpoint',
      defaultValue: true,
      example: true,
    },
    {
      key: 'PASSWORD_MIN_LENGTH',
      type: 'number',
      description: 'Minimum password length for registration and password changes',
      defaultValue: 8,
      example: 8,
    },
    {
      key: 'MAX_SESSIONS_PER_USER',
      type: 'number',
      description: 'Maximum concurrent sessions per user (0 = unlimited)',
      defaultValue: 0,
      example: 5,
    },
  ],
  events: {
    emits: [
      'auth.user.login',
      'auth.user.registered',
      'auth.user.logout',
      'auth.user.passwordReset',
      'auth.user.passwordChanged',
      'auth.apiKey.created',
      'auth.apiKey.revoked',
      'auth.session.revoked',
    ],
    schemas: eventSchemas,
  },
  chat: {
    description:
      'Authentication and identity module. Manages users, sessions, API keys, and password reset flows with a pluggable adapter architecture.',
    capabilities: [
      'list and manage users',
      'create and revoke API keys',
      'view and revoke sessions',
      'trigger password reset',
    ],
    actionSchemas: [
      {
        name: 'auth.listUsers',
        description: 'List users with optional filtering by status or search query',
        parameters: {
          status: { type: 'string', description: 'Filter by user status (active, inactive, suspended)' },
          q: { type: 'string', description: 'Search by name or email' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['users.read'],
        endpoint: { method: 'GET', path: 'users' },
      },
      {
        name: 'auth.getUser',
        description: 'Get a specific user by ID',
        parameters: {
          id: { type: 'number', description: 'User ID', required: true },
        },
        returns: { id: { type: 'number' }, email: { type: 'string' }, name: { type: 'string' } },
        requiredPermissions: ['users.read'],
        endpoint: { method: 'GET', path: 'users/[id]' },
      },
      {
        name: 'auth.listApiKeys',
        description: 'List API keys with optional filtering',
        parameters: {
          tenantId: { type: 'number', description: 'Filter by tenant' },
          userId: { type: 'number', description: 'Filter by user' },
          enabled: { type: 'boolean', description: 'Filter by enabled status' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['api-keys.read'],
        endpoint: { method: 'GET', path: 'api-keys' },
      },
      {
        name: 'auth.createApiKey',
        description: 'Create a new API key',
        parameters: {
          name: { type: 'string', description: 'Key name', required: true },
          tenantId: { type: 'number', description: 'Scope to tenant' },
          userId: { type: 'number', description: 'Scope to user' },
          permissions: { type: 'array', description: 'Permission slugs' },
        },
        returns: { id: { type: 'number' }, key: { type: 'string' } },
        requiredPermissions: ['api-keys.create'],
        endpoint: { method: 'POST', path: 'api-keys' },
      },
      {
        name: 'auth.listSessions',
        description: 'List active sessions',
        parameters: {
          userId: { type: 'number', description: 'Filter by user' },
        },
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['auth-sessions.read'],
        endpoint: { method: 'GET', path: 'auth-sessions' },
      },
    ],
  },
};

// ─── Re-exports ──────────────────────────────────────────────────
export { registerAuthAdapter, setActiveAuthAdapter, getAuthAdapter } from './adapters/registry';
export { authSchema } from './schema';
export { seedAuth } from './seed';
export * from './types';
