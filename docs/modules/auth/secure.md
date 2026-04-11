# Module Auth — Security

## Threat Model

| Threat                                   | Mitigation                                                                                              |
|------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Credential stuffing                       | Rate limit (R9.3), generic "invalid credential" response, no user enumeration                          |
| Session theft (XSS → cookie grab)        | `HttpOnly` + `Secure` + `SameSite=Lax` cookies; JS APIs never see the session                           |
| Token reuse after logout                  | Session row deleted on logout; middleware re-checks `auth_sessions` hash on every request              |
| Refresh-token replay                      | Refresh rotation; reused refresh triggers full session delete (R4.3)                                    |
| Brute-force API key                       | 32-byte random keys, hashed with sha256; prefix-only display; expiry enforced even on enabled keys      |
| Password dump                             | Argon2id `m=19456, t=2, p=1`; salt 16 bytes; no password in any log or event payload                   |
| Cross-tenant data leak                    | RLS on `users`, `auth_sessions`, `api_keys`, `password_reset_tokens`; handler-layer tenant filter        |
| Timing side channel on login              | Constant-time password compare via `argon2Verify`; always call adapter even on missing user            |
| Enumeration via forgot-password           | Always returns `200`; no difference in response body or timing (queued async)                          |
| Privilege escalation via permission array | Permissions resolved fresh per request — no caching across requests                                    |

## RLS Policies

All policies enable `ROW LEVEL SECURITY` on the table and ship in a
dedicated migration in sprint-03. Policy SQL (abbreviated):

```sql
-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_read ON users
  FOR SELECT USING (id = current_setting('app.user_id')::int);

CREATE POLICY users_tenant_admin_read ON users
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM tenant_members
      WHERE tenant_id = ANY (string_to_array(current_setting('app.tenant_ids'), ',')::int[])
    )
    AND current_setting('app.role') = 'tenant_admin'
  );

CREATE POLICY users_platform_admin_all ON users
  FOR ALL USING (current_setting('app.role') = 'platform_admin');

-- auth_sessions: owner-only read/write, service role bypass
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY as_owner ON auth_sessions
  FOR ALL USING (user_id = current_setting('app.user_id')::int);

-- api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY ak_owner ON api_keys
  FOR SELECT USING (user_id = current_setting('app.user_id')::int);
CREATE POLICY ak_tenant_admin ON api_keys
  FOR SELECT USING (
    tenant_id = ANY (string_to_array(current_setting('app.tenant_ids'), ',')::int[])
    AND current_setting('app.role') = 'tenant_admin'
  );

-- password_reset_tokens: service role only (no client policy)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
```

Per-request, the middleware issues
`SET LOCAL app.user_id = $1, app.tenant_ids = $2, app.role = $3`
through a prepared wrapper so RLS variables match the attached
`AuthContext`.

## Password Storage

- **Algorithm**: Argon2id via `hash-wasm` (WASM, no native deps).
- **Parameters**: `m=19456, t=2, p=1` (OWASP Argon2id baseline 2025).
- **Salt**: 16 bytes from `crypto.getRandomValues`.
- **Stored format**: the `hash-wasm` output includes algorithm +
  parameters + salt + hash, so a future parameter bump remains
  verifiable against old hashes.
- **No pepper** — secret rotation would require re-hashing every
  password, and the operational cost exceeds the marginal benefit.
  Reconsider if the DB backup policy changes.

## API-key Format

```
oven_<8-hex-prefix><24-base64url>
```

- Example: `oven_1a2b3c4d_qZ7y8xV2pN3mK9wH...`
- Total length: 48 characters.
- `keyPrefix` column stores `oven_1a2b3c4d` (13 chars counting the
  underscore). The dashboard renders it with `••••` padding.

## Secrets Management

| Secret             | Required | Source                        | Rotation        |
|--------------------|----------|-------------------------------|-----------------|
| `AUTH_SECRET`      | yes      | env                           | manual          |
| `AUTH_JWT_ISS`     | yes      | env                           | manual          |
| `AUTH_OAUTH_*`     | optional | env (only if OAuth enabled)   | manual          |

Missing `AUTH_SECRET` at startup raises `AuthConfigError` **before**
the Next.js server accepts any request. Handled in
`apps/dashboard/src/lib/modules.ts` alongside `registerAuthAdapter`.

## Rate Limits

| Endpoint              | Limit                          | Key                    |
|-----------------------|--------------------------------|------------------------|
| `POST /api/auth/login` | 5 req / 60 s                   | `ip + email`           |
| `POST /api/auth/forgot-password` | 3 req / 600 s          | `email`                |
| `POST /api/auth/register` | 5 req / 600 s                  | `ip`                   |
| `POST /api/auth/refresh` | 60 req / 60 s                  | `user_id`              |

Implementation: a small in-memory + Redis hybrid backed by
`@oven/module-registry/rate-limit` (to be introduced in sprint-01;
tracked in `detailed-requirements.md` R9.3).

## Audit Events

Every non-read state change emits an `auth.*` event. `module-notifications`
subscribes to them for the audit log persistence stream. Sensitive
fields (password, plaintext tokens) MUST NOT appear in event payloads.
