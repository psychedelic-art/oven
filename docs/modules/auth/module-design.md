# Module Auth — Module Design

## ModuleDefinition

`packages/module-auth/src/index.ts` exports the canonical
`authModule: ModuleDefinition` consumed by
`apps/dashboard/src/lib/modules.ts`. Full shape documented in
`docs/modules/17-auth.md` §10.

```typescript
import type { ModuleDefinition } from '@oven/module-registry';
import { users, authSessions, apiKeys, passwordResetTokens } from './schema';
import { seedAuth } from './seed';
// ... handler imports omitted

export const authModule: ModuleDefinition = {
  name: 'auth',
  dependencies: ['roles'],
  description:
    'Authentication with JWT, sessions, API keys and tenant-scoped access control. Pluggable adapter pattern (authjs MVP, firebase/auth0 planned).',
  capabilities: [
    'authenticate users',
    'manage sessions',
    'manage API keys',
    'reset passwords',
  ],
  schema: { users, authSessions, apiKeys, passwordResetTokens },
  seed: seedAuth,
  resources: [/* api-keys */],
  customRoutes: [/* /login, /register, /profile, ... */],
  menuItems: [{ label: 'API Keys', to: '/api-keys' }],
  apiHandlers: {/* 12 routes, see api.md */},
  configSchema: [/* 5 keys, see 17-auth.md §10 */],
  events: {/* 8 events emitted, see 17-auth.md §10 */},
  chat: {/* AI-callable actions */},
};
```

## Adapter Interface

```typescript
// packages/module-auth/src/adapters/types.ts
export interface AuthAdapter {
  name: string;
  verifyToken(token: string): Promise<AuthUser | null>;
  createSession(user: AuthUser): Promise<SessionToken>;
  revokeSession(token: string): Promise<void>;
  verifyApiKey(key: string): Promise<ApiKeyInfo | null>;
  getLoginUrl?(provider: string, redirectUrl: string): string;
  handleCallback?(code: string): Promise<AuthUser>;
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
  expiresIn: number;
}

export interface ApiKeyInfo {
  id: number;
  tenantId: number | null;
  userId: number | null;
  permissions: string[] | null;
}
```

Only `name`, `verifyToken`, `createSession`, `revokeSession`, and
`verifyApiKey` are required. The others are feature-flagged per
adapter. `module-auth` throws a typed error when an unsupported
capability is called.

## Registry

```typescript
// packages/module-auth/src/adapters/registry.ts
const adapters = new Map<string, AuthAdapter>();
let activeAdapter: AuthAdapter | null = null;

export function registerAuthAdapter(adapter: AuthAdapter): void {
  adapters.set(adapter.name, adapter);
  if (!activeAdapter) activeAdapter = adapter;
}

export function setActiveAuthAdapter(name: string): void {
  const adapter = adapters.get(name);
  if (!adapter) throw new Error(`Auth adapter "${name}" not registered`);
  activeAdapter = adapter;
}

export function getAuthAdapter(): AuthAdapter {
  if (!activeAdapter) throw new Error('No auth adapter registered');
  return activeAdapter;
}
```

Matches the `notifications` adapter registry 1:1 so the pattern is
visually identical across modules (Rule 3.3 from
`docs/module-rules.md`).

## AuthContext

```typescript
// packages/module-auth/src/get-auth-context.ts
export interface AuthContext {
  userId: number;
  email: string;
  name: string;
  tenantId: number | null;
  tenantMemberships: TenantMember[];
  roles: Role[];
  permissions: string[];
  authMethod: 'jwt' | 'session' | 'api-key' | 'session-token';
}

export function getAuthContext(request: NextRequest): AuthContext {
  const ctx = (request as unknown as { __authContext?: AuthContext }).__authContext;
  if (!ctx) {
    throw new Error(
      'getAuthContext called without running the auth middleware first',
    );
  }
  return ctx;
}
```

Consumers must `import type { AuthContext }` (Rule: `import type` for
type-only imports from `CLAUDE.md`).

## Contract With Other Modules

| Consumer           | Contract                                                              |
|--------------------|-----------------------------------------------------------------------|
| `module-roles`     | `getPermissionsForUser(userId, tenantId): Promise<string[]>`          |
| `module-tenants`   | `getMembershipsForUser(userId): Promise<TenantMember[]>`              |
| `module-config`    | 5 keys resolved per request (cached to request scope only)            |
| `module-notifications` | Subscribes to `auth.user.*` events via the `events` bus          |
| Dashboard handlers | `getAuthContext(request).permissions.includes(slug)`                   |

Tests assert that **no** runtime code in `packages/module-auth/src/`
imports `jsonwebtoken`, `next-auth`, `argon2`, `bcrypt`, `hash-wasm`
(enforced by `no-restricted-imports` ESLint rule introduced in
sprint-01).
