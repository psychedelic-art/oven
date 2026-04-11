# Module Auth — Database

All tables live in `packages/module-auth/src/schema.ts`. Integer
foreign keys only — no Drizzle `references()` — so modules can register
in any order (Rule 3.1 from `docs/module-rules.md`).

## Tables

### `users`

```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),          // nullable for SSO users
  avatar: varchar('avatar', { length: 500 }),
  defaultTenantId: integer('default_tenant_id'),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active | inactive | invited
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('users_email_idx').on(table.email),
  index('users_status_idx').on(table.status),
  index('users_default_tenant_idx').on(table.defaultTenantId),
]);
```

Notes:

- `email` is globally unique — one user, many tenants via
  `module-tenants.tenant_members`.
- `passwordHash` is nullable: SSO-only users never store a password.
- `status = 'invited'` is a pre-activation state; invited users can
  log in only to complete registration and then flip to `active`.

### `auth_sessions`

```typescript
export const authSessions = pgTable('auth_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  token: varchar('token', { length: 500 }).notNull(),               // HASH, not plaintext
  refreshToken: varchar('refresh_token', { length: 500 }),           // HASH, not plaintext
  expiresAt: timestamp('expires_at').notNull(),
  refreshExpiresAt: timestamp('refresh_expires_at'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('as_user_id_idx').on(table.userId),
  index('as_token_idx').on(table.token),
  index('as_expires_at_idx').on(table.expiresAt),
]);
```

Notes:

- `token` and `refreshToken` store `sha256(plaintext)` hex. Plaintext
  never hits the DB. Verification re-hashes and compares.
- Rows are deleted, not marked revoked. Audit is the event stream.
- Periodic job `DELETE FROM auth_sessions WHERE expires_at < now()`
  runs hourly (sprint-04 deliverable).

### `api_keys`

```typescript
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),          // sha256 hex
  keyPrefix: varchar('key_prefix', { length: 10 }).notNull(),       // first 8 chars, plaintext
  tenantId: integer('tenant_id'),                                    // null = platform/global
  userId: integer('user_id'),
  permissions: jsonb('permissions'),                                  // explicit override, null = inherit from user
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('ak_key_hash_idx').on(table.keyHash),
  index('ak_key_prefix_idx').on(table.keyPrefix),
  index('ak_tenant_id_idx').on(table.tenantId),
  index('ak_user_id_idx').on(table.userId),
  index('ak_enabled_idx').on(table.enabled),
]);
```

Notes:

- `keyPrefix` is the first 8 characters of the plaintext key, stored
  in the clear so the dashboard can show `oven_1a2b3c4d••••` without
  needing the plaintext.
- Plaintext is returned **once** on create and never again — the
  `ApiKeyCreate` dialog shows a copy-to-clipboard banner and forces
  the user to acknowledge before closing.

### `password_reset_tokens`

```typescript
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('prt_user_id_idx').on(table.userId),
  index('prt_token_hash_idx').on(table.tokenHash),
]);
```

Notes:

- Single-use: `usedAt` is stamped on successful reset and the row is
  otherwise deleted after `expiresAt`.
- Rate-limited: `forgot-password` will refuse to create a new row if
  an unused, non-expired row already exists for the user.

## RLS Policies

Documented in [`secure.md`](./secure.md). Summary:

- `users`: readable by self + platform admins + same-tenant admins
  (via `tenant_members` join).
- `auth_sessions`: readable only by owner. Writable only by owner or
  the auth middleware (service role).
- `api_keys`: readable by owner + same-tenant admins. `keyHash` is
  never exposed to clients — the service role is the only principal
  that reads it.
- `password_reset_tokens`: never readable by clients. Service role
  only.

## Seed Data

`seed.ts` inserts:

1. The 9 module permissions listed in `docs/modules/17-auth.md` §11
   via `onConflictDoNothing`.
2. 5 `api_endpoint_permissions` rows marking login, register, refresh,
   forgot-password, reset-password as `isPublic = true`.

Seed is **idempotent** — re-running must not duplicate rows (Rule 3.2).
