import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// ─── users ───────────────────────────────────────────────────────
// Core user identity table. Stores credentials and profile data.
// passwordHash is nullable to support SSO-only users.
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    avatar: varchar('avatar', { length: 500 }),
    defaultTenantId: integer('default_tenant_id'),
    status: varchar('status', { length: 50 }).default('active'),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_status_idx').on(table.status),
    index('users_default_tenant_id_idx').on(table.defaultTenantId),
  ]
);

// ─── auth_sessions ───────────────────────────────────────────────
// Active login sessions. Tracks access tokens and optional
// refresh tokens with expiry timestamps.
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    token: varchar('token', { length: 500 }).notNull(),
    refreshToken: varchar('refresh_token', { length: 500 }),
    expiresAt: timestamp('expires_at').notNull(),
    refreshExpiresAt: timestamp('refresh_expires_at'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('auth_sessions_user_id_idx').on(table.userId),
    index('auth_sessions_token_idx').on(table.token),
    index('auth_sessions_expires_at_idx').on(table.expiresAt),
  ]
);

// ─── api_keys ────────────────────────────────────────────────────
// Programmatic API keys for service-to-service or CI/CD access.
// Only the hash is stored; the full key is returned once at creation.
export const apiKeys = pgTable(
  'api_keys',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    keyHash: varchar('key_hash', { length: 255 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 10 }).notNull(),
    tenantId: integer('tenant_id'),
    userId: integer('user_id'),
    permissions: jsonb('permissions'),
    lastUsedAt: timestamp('last_used_at'),
    expiresAt: timestamp('expires_at'),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('api_keys_key_hash_idx').on(table.keyHash),
    index('api_keys_key_prefix_idx').on(table.keyPrefix),
    index('api_keys_tenant_id_idx').on(table.tenantId),
    index('api_keys_user_id_idx').on(table.userId),
    index('api_keys_enabled_idx').on(table.enabled),
  ]
);

// ─── password_reset_tokens ───────────────────────────────────────
// One-time-use tokens for password reset flows.
// Only the hash is stored for security.
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('password_reset_tokens_user_id_idx').on(table.userId),
    index('password_reset_tokens_token_hash_idx').on(table.tokenHash),
  ]
);

// Export all schemas for registry composition
export const authSchema = {
  users,
  authSessions,
  apiKeys,
  passwordResetTokens,
};
