# Module: Auth

> **Package**: `packages/module-auth/`
> **Name**: `@oven/module-auth`
> **Dependencies**: `module-registry`, `module-roles`
> **Status**: Planned

---

## 1. Overview

Auth is the **authentication and authorization module** that provides identity verification, session management, API key handling, and tenant-scoped access control. It implements multiple auth strategies — JWT/session tokens for the dashboard, API keys for webhook endpoints and programmatic access, and session tokens for anonymous widget users.

Auth integrates with `module-roles` for RBAC enforcement. After authenticating a request, the middleware resolves the user's roles and permissions and attaches them to the request context. All downstream API handlers can then check permissions without knowing auth implementation details.

### Auth Strategies

| Strategy | Use Case | Token Location |
|----------|----------|---------------|
| **JWT** | Dashboard login (email + password) | `Authorization: Bearer <token>` |
| **Session** | Persistent dashboard sessions | HTTP-only cookie |
| **API Key** | Webhooks, external integrations, CI/CD | `X-API-Key: <key>` |
| **Session Token** | Anonymous chat widget users | `X-Session-Token: <token>` |

---

## 2. Core Concepts

### User
A platform user with email, password hash, and optional tenant association. Users can belong to multiple tenants via `module-tenants` tenant members.

### Auth Session
A persistent login session with token, expiration, and device metadata. Sessions support refresh token rotation for seamless re-authentication.

### API Key
A named, scoped key for programmatic API access. API keys can be tenant-scoped (access only that tenant's data) or global (for platform admin use). Each key has configurable permission scoping.

### Auth Middleware
A Next.js middleware that runs on every API request. Extracts credentials from the request, validates them, resolves user + tenant + permissions, and attaches the auth context to the request. Failed auth returns 401. Missing permissions return 403.

---

## 3. Database Schema

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

### Flow

```
Request → Middleware →
  1. Check for public endpoint (api_endpoint_permissions.isPublic) → Skip auth
  2. Check for API Key (X-API-Key header) → Validate hash, resolve permissions
  3. Check for Session Token (X-Session-Token header) → Validate anonymous session
  4. Check for Bearer Token (Authorization header) → Validate JWT
  5. Check for Session Cookie → Validate session
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

## 5. JWT Utilities

```typescript
// Token generation
export function generateAccessToken(user: User, tenantId?: number): string {
  return jwt.sign(
    { sub: user.id, email: user.email, tid: tenantId },
    process.env.JWT_SECRET!,
    { expiresIn: '15m', algorithm: 'HS256' }
  );
}

export function generateRefreshToken(user: User): string {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
}

// Token verification
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}

// Password hashing (argon2)
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

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

- **API Keys** — List, Create
  - List: Datagrid with name, key prefix, tenant scope, last used, expiry, enabled toggle
  - Create: Form with name, tenant selector (optional), expiry date, permission overrides. Shows the full API key **once** after creation

### Custom Pages

- **Login Page** (`/login`) — Email/password form with "Forgot password?" link
- **Register Page** (`/register`) — User registration form (if self-registration is enabled)
- **Profile Page** (`/profile`) — Name, email, avatar, password change, active sessions list
- **Active Sessions** (`/profile/sessions`) — List of active sessions with device info and revoke buttons

### Menu Section

```
──── Account ────
API Keys
Profile
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
    description: 'Authentication module with JWT, session, and API key strategies. Manages users, sessions, and API keys with tenant-scoped access control.',
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
// POST /api/auth/login — Login handler
import { badRequest, notFound } from '@oven/module-registry/api-utils';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) return badRequest('Email and password are required');

  const [user] = await db.select().from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || user.status !== 'active') return notFound('Invalid credentials');

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return notFound('Invalid credentials');

  const accessToken = generateAccessToken(user, user.defaultTenantId);
  const refreshToken = generateRefreshToken(user);

  // Create session record
  await db.insert(authSessions).values({
    userId: user.id,
    token: hashToken(accessToken),
    refreshToken: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
    authMethod: 'jwt',
  });

  return Response.json({
    accessToken,
    refreshToken,
    expiresIn: 900,
    user: { id: user.id, email: user.email, name: user.name, defaultTenantId: user.defaultTenantId },
  });
}
```
