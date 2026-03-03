# Module: Auth

> **Package**: `packages/module-auth/`
> **Name**: `@oven/module-auth`
> **Dependencies**: `module-registry`, `module-roles`
> **Status**: Planned

---

## 1. Overview

Auth is the **authentication and authorization module** that provides identity verification, session management, API key handling, and tenant-scoped access control. It uses the **adapter pattern** (matching the existing `execution-strategy.ts` pattern from `module-workflows`) to support pluggable auth providers — AuthJS for the MVP, with Firebase and Auth0 adapters planned.

Auth integrates with `module-roles` for RBAC enforcement. After authenticating a request, the middleware delegates to the active `AuthAdapter`, resolves the user's roles and permissions, and attaches them to the request context. All downstream API handlers can then check permissions without knowing which auth provider is active.

### Auth Strategies

| Strategy | Use Case | Token Location |
|----------|----------|---------------|
| **JWT** | Dashboard login (email + password) | `Authorization: Bearer <token>` |
| **Session** | Persistent dashboard sessions | HTTP-only cookie |
| **API Key** | Webhooks, external integrations, CI/CD | `X-API-Key: <key>` |
| **Session Token** | Anonymous chat widget users | `X-Session-Token: <token>` |

### Adapter Packages

| Package | Provider | MVP? |
|---------|----------|------|
| `packages/auth-authjs/` | AuthJS (Next.js native) | **Yes** — simplest for Next.js 15 |
| `packages/auth-firebase/` | Firebase Auth | Future |
| `packages/auth-auth0/` | Auth0 | Future |

---

## 2. Core Concepts

### User
A platform user with email, password hash, and optional tenant association. Users can belong to multiple tenants via `module-tenants` tenant members.

### Auth Session
A persistent login session with token, expiration, and device metadata. Sessions support refresh token rotation for seamless re-authentication.

### API Key
A named, scoped key for programmatic API access. API keys can be tenant-scoped (access only that tenant's data) or global (for platform admin use). Each key has configurable permission scoping.

### Auth Middleware
A Next.js middleware that runs on every API request. Extracts credentials from the request, delegates to the active `AuthAdapter` for validation, resolves user + tenant + permissions, and attaches the auth context to the request. Failed auth returns 401. Missing permissions return 403.

---

## 3. Adapter Interface

The auth module defines an `AuthAdapter` interface; separate packages implement it for each provider. This matches the adapter pattern used by `module-notifications` (Rule 3.3 from `module-rules.md`) and mirrors the `execution-strategy.ts` pattern already in the codebase.

```typescript
// packages/module-auth/src/adapters/types.ts
export interface AuthAdapter {
  name: string;                                                       // 'authjs' | 'firebase' | 'auth0'
  // Core auth operations
  verifyToken(token: string): Promise<AuthUser | null>;
  createSession(user: AuthUser): Promise<SessionToken>;
  revokeSession(token: string): Promise<void>;
  // API key verification (shared across all adapters — uses DB directly)
  verifyApiKey(key: string): Promise<ApiKeyInfo | null>;
  // Optional: social login, MFA, provider-specific features
  getLoginUrl?(provider: string, redirectUrl: string): string;
  handleCallback?(code: string): Promise<AuthUser>;
  // Optional: password operations (not all providers use passwords)
  hashPassword?(password: string): Promise<string>;
  verifyPassword?(password: string, hash: string): Promise<boolean>;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  avatar?: string;
  defaultTenantId?: number;
}

export interface SessionToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;                                                  // seconds
}

export interface ApiKeyInfo {
  id: number;
  tenantId: number | null;
  userId: number | null;
  permissions: string[] | null;
}
```

### Adapter Registry

```typescript
// packages/module-auth/src/adapters/registry.ts
const adapters = new Map<string, AuthAdapter>();
let activeAdapter: AuthAdapter | null = null;

export function registerAuthAdapter(adapter: AuthAdapter) {
  adapters.set(adapter.name, adapter);
  if (!activeAdapter) activeAdapter = adapter;                        // first registered becomes default
}

export function setActiveAuthAdapter(name: string) {
  const adapter = adapters.get(name);
  if (!adapter) throw new Error(`Auth adapter "${name}" not registered`);
  activeAdapter = adapter;
}

export function getAuthAdapter(): AuthAdapter {
  if (!activeAdapter) throw new Error('No auth adapter registered');
  return activeAdapter;
}
```

### AuthJS Adapter (MVP)

```typescript
// packages/auth-authjs/src/index.ts
import type { AuthAdapter } from '@oven/module-auth';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { argon2Verify, argon2Hash } from 'hash-wasm';

export const authJsAdapter: AuthAdapter = {
  name: 'authjs',

  async verifyToken(token: string): Promise<AuthUser | null> {
    // Verify JWT signed by NextAuth
    const payload = await decode({ token, secret: process.env.AUTH_SECRET! });
    if (!payload?.sub) return null;
    return { id: Number(payload.sub), email: payload.email!, name: payload.name! };
  },

  async createSession(user: AuthUser): Promise<SessionToken> {
    const accessToken = await encode({
      token: { sub: String(user.id), email: user.email, name: user.name },
      secret: process.env.AUTH_SECRET!,
      maxAge: 15 * 60,
    });
    return { accessToken, expiresIn: 900 };
  },

  async revokeSession(token: string): Promise<void> {
    // Invalidate in auth_sessions table
    const hashed = hashToken(token);
    await db.delete(authSessions).where(eq(authSessions.token, hashed));
  },

  async verifyApiKey(key: string): Promise<ApiKeyInfo | null> {
    const hashed = hashToken(key);
    const [row] = await db.select().from(apiKeys)
      .where(and(eq(apiKeys.keyHash, hashed), eq(apiKeys.enabled, true)))
      .limit(1);
    if (!row || (row.expiresAt && row.expiresAt < new Date())) return null;
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
    return { id: row.id, tenantId: row.tenantId, userId: row.userId, permissions: row.permissions };
  },

  async hashPassword(password: string): Promise<string> {
    return argon2Hash({ password, salt: crypto.getRandomValues(new Uint8Array(16)), type: 2 });
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return argon2Verify({ password, hash });
  },
};
```

### Registration at App Startup

```typescript
// apps/dashboard/src/lib/modules.ts
import { registerAuthAdapter } from '@oven/module-auth';
import { authJsAdapter } from '@oven/auth-authjs';

registerAuthAdapter(authJsAdapter);  // MVP — AuthJS for Next.js
// Future: registerAuthAdapter(firebaseAdapter);
// Future: registerAuthAdapter(auth0Adapter);
```

---

## 4. Database Schema

### Tables

**`users`** — User accounts
```typescript
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),         // nullable for SSO/OAuth users
  avatar: varchar('avatar', { length: 500 }),
  defaultTenantId: integer('default_tenant_id'),                    // preferred tenant on login
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

**`auth_sessions`** — Active login sessions
```typescript
export const authSessions = pgTable('auth_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  token: varchar('token', { length: 500 }).notNull(),               // hashed session token
  refreshToken: varchar('refresh_token', { length: 500 }),           // hashed refresh token
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

**`api_keys`** — Programmatic API keys
```typescript
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 255 }).notNull(),          // hashed API key (plaintext only shown once)
  keyPrefix: varchar('key_prefix', { length: 10 }).notNull(),       // first 8 chars for identification
  tenantId: integer('tenant_id'),                                    // nullable — null means global/platform key
  userId: integer('user_id'),                                        // who created it
  permissions: jsonb('permissions'),                                  // explicit permission overrides (null = inherit from user)
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),                                // nullable — null means never expires
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

**`password_reset_tokens`** — Password reset flow
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

---

## 4. Auth Middleware

The middleware delegates all token/credential verification to the active `AuthAdapter` — it never calls JWT or password libraries directly.

### Flow

```
Request → Middleware →
  1. Check for public endpoint (api_endpoint_permissions.isPublic) → Skip auth
  2. Check for API Key (X-API-Key header) → adapter.verifyApiKey(key)
  3. Check for Session Token (X-Session-Token header) → Validate anonymous session (DB lookup)
  4. Check for Bearer Token (Authorization header) → adapter.verifyToken(token)
  5. Check for Session Cookie → adapter.verifyToken(cookieValue)
  6. No credentials → 401 Unauthorized

After auth:
  7. Resolve user's roles + permissions from module-roles
  8. Resolve user's tenant memberships from module-tenants
  9. Set active tenant (from X-Tenant-Id header, default tenant, or first membership)
  10. Attach auth context to request
```

### Auth Context

```typescript
interface AuthContext {
  userId: number;
  email: string;
  name: string;
  tenantId: number | null;          // active tenant
  tenantMemberships: TenantMember[];
  roles: Role[];
  permissions: string[];            // flattened permission slugs
  authMethod: 'jwt' | 'session' | 'api-key' | 'session-token';
}

// Accessible in API handlers:
const auth = getAuthContext(request);
if (!auth.permissions.includes('kb-entries.create')) {
  return forbidden();
}
```

---

## 5. Token & Password Utilities (Adapter-Delegated)

All token generation, verification, and password hashing is delegated to the active `AuthAdapter`. The module provides thin wrappers that call `getAuthAdapter()`:

```typescript
// packages/module-auth/src/auth-utils.ts
import { getAuthAdapter } from './adapters/registry';

export async function verifyToken(token: string) {
  return getAuthAdapter().verifyToken(token);
}

export async function createSession(user: AuthUser) {
  return getAuthAdapter().createSession(user);
}

export async function verifyApiKey(key: string) {
  return getAuthAdapter().verifyApiKey(key);
}

export async function hashPassword(password: string) {
  const adapter = getAuthAdapter();
  if (!adapter.hashPassword) throw new Error('Active auth adapter does not support password hashing');
  return adapter.hashPassword(password);
}

export async function verifyPassword(password: string, hash: string) {
  const adapter = getAuthAdapter();
  if (!adapter.verifyPassword) throw new Error('Active auth adapter does not support password verification');
  return adapter.verifyPassword(password, hash);
}
```

**Why adapter-delegated?** Different providers handle tokens differently:
- **AuthJS** uses NextAuth `encode()`/`decode()` with `AUTH_SECRET`
- **Firebase** uses Firebase Admin SDK `verifyIdToken()`
- **Auth0** uses JWKS endpoint for RS256 verification

The module never imports `jsonwebtoken` or `argon2` directly — those are implementation details of the adapter package.

---

## 6. API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| POST | `/api/auth/login` | Email + password login | **Public** |
| POST | `/api/auth/register` | Create new user account | **Public** (or admin-only) |
| POST | `/api/auth/logout` | Invalidate session | Authenticated |
| GET | `/api/auth/me` | Get current user + context | Authenticated |
| POST | `/api/auth/refresh` | Refresh access token | **Public** (with refresh token) |
| POST | `/api/auth/forgot-password` | Send password reset email | **Public** |
| POST | `/api/auth/reset-password` | Reset password with token | **Public** |
| GET/POST | `/api/auth/api-keys` | List and create API keys | Authenticated |
| DELETE | `/api/auth/api-keys/[id]` | Revoke an API key | Authenticated |
| GET | `/api/auth/sessions` | List active sessions | Authenticated |
| DELETE | `/api/auth/sessions/[id]` | Revoke a session | Authenticated |

### Login Request/Response

```
POST /api/auth/login
{ "email": "admin@clinica-xyz.com", "password": "..." }

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "email": "admin@clinica-xyz.com",
    "name": "Admin",
    "defaultTenantId": 5
  }
}
```

---

## 7. Dashboard UI

### React Admin Resources

- **Users** — List, Create, Edit, Show (tenant-scoped via `tenant_members` join)
  - List: Datagrid filterable by tenant. Columns: name, email, status, login history
  - Create: Invite user — email, name, tenant, role assignment
  - Edit: Edit user details, toggle active/inactive
  - Show: User details, login history, tenant memberships

- **API Keys** — List, Create, Show
  - List: Datagrid with name, key prefix (masked), tenant scope, last used, expiry, enabled toggle
  - Create: Form with name, tenant selector (optional), permissions, expiry date. Shows the full API key **once** after creation
  - Show: Key details (key shown only on creation)

### Custom Pages

- **Login Page** (`/login`) — Email/password form with "Forgot password?" link. Outside `<Admin>` layout (no sidebar). Redirects to dashboard on success
- **Register Page** (`/register`) — User registration form (if self-registration enabled via config)
- **Profile Page** (`/profile`) — Current user profile: change password, view sessions, tenant memberships
- **Active Sessions** (`/profile/sessions`) — Active sessions with device info and revoke buttons

### Files to Create

```
apps/dashboard/src/components/auth/
  LoginPage.tsx           — Email/password form, calls POST /api/auth/login
  ProfilePage.tsx         — User profile, password change
  UserList.tsx            — List users (filterable by tenant)
  UserCreate.tsx          — Invite user: email, name, tenant, role
  UserEdit.tsx            — Edit user details, toggle active/inactive
  UserShow.tsx            — View user details, login history
  ApiKeyList.tsx          — List API keys (masked), last used, expiry
  ApiKeyCreate.tsx        — Generate new key: name, tenant, permissions, expiry
  ApiKeyShow.tsx          — View key details (key shown once on create)
```

### Menu Section

```
──── Access Control ────
Users
API Keys
```

---

## 8. Events

| Event | Payload |
|-------|---------|
| `auth.user.registered` | userId, email, name |
| `auth.user.login` | userId, email, ipAddress, authMethod |
| `auth.user.logout` | userId, sessionId |
| `auth.user.passwordChanged` | userId, email |
| `auth.user.passwordReset` | userId, email |
| `auth.apiKey.created` | keyId, name, tenantId, userId |
| `auth.apiKey.revoked` | keyId, name, userId |
| `auth.session.expired` | sessionId, userId |

---

## 9. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | After auth, resolves user's roles and permissions for RBAC enforcement |
| **module-tenants** | Resolves user's tenant memberships, sets active tenant context |
| **module-notifications** | API keys used for webhook authentication (WhatsApp verification) |
| **module-chat** | Anonymous session tokens for web widget users |
| **module-agent-core** | Agent invocations carry auth context for permission checking |
| **module-workflows** | Workflow triggers on auth events (send welcome email on registration) |

---

## 10. ModuleDefinition

```typescript
export const authModule: ModuleDefinition = {
  name: 'auth',
  dependencies: ['roles'],
  description: 'Authentication with JWT, sessions, API keys, and tenant-scoped access control',
  capabilities: [
    'authenticate users',
    'manage sessions',
    'manage API keys',
    'reset passwords',
  ],
  schema: { users, authSessions, apiKeys, passwordResetTokens },
  seed: seedAuth,
  resources: [
    {
      name: 'api-keys',
      list: ApiKeyList,
      create: ApiKeyCreate,
      icon: VpnKeyIcon,
      options: { label: 'API Keys' },
    },
  ],
  customRoutes: [
    { path: '/login', component: LoginPage, noLayout: true },
    { path: '/register', component: RegisterPage, noLayout: true },
    { path: '/profile', component: ProfilePage },
    { path: '/profile/sessions', component: ActiveSessionsPage },
    { path: '/forgot-password', component: ForgotPasswordPage, noLayout: true },
    { path: '/reset-password', component: ResetPasswordPage, noLayout: true },
  ],
  menuItems: [
    { label: 'API Keys', to: '/api-keys' },
  ],
  apiHandlers: {
    'auth/login': { POST: login },
    'auth/register': { POST: register },
    'auth/logout': { POST: logout },
    'auth/me': { GET: getMe },
    'auth/refresh': { POST: refreshToken },
    'auth/forgot-password': { POST: forgotPassword },
    'auth/reset-password': { POST: resetPassword },
    'auth/api-keys': { GET: listApiKeys, POST: createApiKey },
    'auth/api-keys/[id]': { DELETE: revokeApiKey },
    'auth/sessions': { GET: listSessions },
    'auth/sessions/[id]': { DELETE: revokeSession },
  },
  configSchema: [
    {
      key: 'JWT_ACCESS_TOKEN_EXPIRY',
      type: 'string',
      description: 'Access token expiry duration',
      defaultValue: '15m',
      instanceScoped: false,
    },
    {
      key: 'JWT_REFRESH_TOKEN_EXPIRY',
      type: 'string',
      description: 'Refresh token expiry duration',
      defaultValue: '7d',
      instanceScoped: false,
    },
    {
      key: 'ALLOW_SELF_REGISTRATION',
      type: 'boolean',
      description: 'Allow users to self-register without admin invitation',
      defaultValue: false,
      instanceScoped: false,
    },
    {
      key: 'PASSWORD_MIN_LENGTH',
      type: 'number',
      description: 'Minimum password length',
      defaultValue: 8,
      instanceScoped: false,
    },
    {
      key: 'MAX_SESSIONS_PER_USER',
      type: 'number',
      description: 'Maximum concurrent sessions per user',
      defaultValue: 5,
      instanceScoped: false,
    },
  ],
  events: {
    emits: [
      'auth.user.registered',
      'auth.user.login',
      'auth.user.logout',
      'auth.user.passwordChanged',
      'auth.user.passwordReset',
      'auth.apiKey.created',
      'auth.apiKey.revoked',
      'auth.session.expired',
    ],
    schemas: {
      'auth.user.registered': {
        userId: { type: 'number', description: 'New user DB ID', required: true },
        email: { type: 'string', description: 'User email' },
        name: { type: 'string', description: 'User display name' },
      },
      'auth.user.login': {
        userId: { type: 'number', description: 'User DB ID', required: true },
        email: { type: 'string', description: 'User email' },
        ipAddress: { type: 'string', description: 'Login IP address' },
        authMethod: { type: 'string', description: 'Auth method used (jwt/session/api-key)' },
      },
      'auth.user.logout': {
        userId: { type: 'number', description: 'User DB ID', required: true },
        sessionId: { type: 'number', description: 'Invalidated session ID' },
      },
      'auth.apiKey.created': {
        keyId: { type: 'number', description: 'API key DB ID', required: true },
        name: { type: 'string', description: 'Key name' },
        tenantId: { type: 'number', description: 'Tenant scope (null = global)' },
        userId: { type: 'number', description: 'Creator user ID' },
      },
      'auth.apiKey.revoked': {
        keyId: { type: 'number', description: 'API key DB ID', required: true },
        name: { type: 'string', description: 'Key name' },
        userId: { type: 'number', description: 'Revoker user ID' },
      },
    },
  },
  chat: {
    description: 'Authentication module with pluggable adapter pattern (AuthJS/Firebase/Auth0). Manages users, sessions, and API keys with tenant-scoped access control.',
    capabilities: [
      'list API keys',
      'create API keys',
      'list sessions',
      'get current user',
    ],
    actionSchemas: [
      {
        name: 'auth.listApiKeys',
        description: 'List API keys for the current user',
        parameters: {},
        returns: { data: { type: 'array' }, total: { type: 'number' } },
        requiredPermissions: ['api-keys.read'],
        endpoint: { method: 'GET', path: 'auth/api-keys' },
      },
      {
        name: 'auth.getMe',
        description: 'Get current authenticated user details',
        parameters: {},
        returns: { id: { type: 'number' }, email: { type: 'string' }, name: { type: 'string' } },
        requiredPermissions: [],
        endpoint: { method: 'GET', path: 'auth/me' },
      },
    ],
  },
};
```

---

## 11. Seed Data

```typescript
export async function seedAuth(db: any) {
  const modulePermissions = [
    { resource: 'users', action: 'read', slug: 'users.read', description: 'View users' },
    { resource: 'users', action: 'create', slug: 'users.create', description: 'Create users' },
    { resource: 'users', action: 'update', slug: 'users.update', description: 'Edit users' },
    { resource: 'users', action: 'delete', slug: 'users.delete', description: 'Deactivate users' },
    { resource: 'api-keys', action: 'read', slug: 'api-keys.read', description: 'View API keys' },
    { resource: 'api-keys', action: 'create', slug: 'api-keys.create', description: 'Create API keys' },
    { resource: 'api-keys', action: 'delete', slug: 'api-keys.delete', description: 'Revoke API keys' },
    { resource: 'auth-sessions', action: 'read', slug: 'auth-sessions.read', description: 'View sessions' },
    { resource: 'auth-sessions', action: 'delete', slug: 'auth-sessions.delete', description: 'Revoke sessions' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Mark public endpoints
  const publicEndpoints = [
    { module: 'auth', route: 'auth/login', method: 'POST', isPublic: true },
    { module: 'auth', route: 'auth/register', method: 'POST', isPublic: true },
    { module: 'auth', route: 'auth/refresh', method: 'POST', isPublic: true },
    { module: 'auth', route: 'auth/forgot-password', method: 'POST', isPublic: true },
    { module: 'auth', route: 'auth/reset-password', method: 'POST', isPublic: true },
  ];

  for (const ep of publicEndpoints) {
    await db.insert(apiEndpointPermissions).values(ep).onConflictDoNothing();
  }
}
```

---

## 12. API Handler Example

```typescript
// POST /api/auth/login — Login handler (adapter-delegated)
import { badRequest, notFound } from '@oven/module-registry/api-utils';
import { verifyPassword, createSession } from '../auth-utils';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) return badRequest('Email and password are required');

  const [user] = await db.select().from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || user.status !== 'active') return notFound('Invalid credentials');

  // Delegate password verification to active adapter
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return notFound('Invalid credentials');

  // Delegate session/token creation to active adapter
  const session = await createSession({
    id: user.id, email: user.email, name: user.name, defaultTenantId: user.defaultTenantId,
  });

  // Create session record in DB (shared across all adapters)
  await db.insert(authSessions).values({
    userId: user.id,
    token: hashToken(session.accessToken),
    refreshToken: session.refreshToken ? hashToken(session.refreshToken) : null,
    expiresAt: new Date(Date.now() + session.expiresIn * 1000),
    refreshExpiresAt: session.refreshToken ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  });

  // Update last login
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  // Emit event
  await eventBus.emit('auth.user.login', {
    userId: user.id,
    email: user.email,
    ipAddress: request.headers.get('x-forwarded-for'),
    authMethod: 'adapter',
  });

  return Response.json({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresIn: session.expiresIn,
    user: { id: user.id, email: user.email, name: user.name, defaultTenantId: user.defaultTenantId },
  });
}
```
