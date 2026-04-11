# Module Auth — API

All routes live under `/api/auth/*` and are served by handlers in
`packages/module-auth/src/api/**`. The `ModuleDefinition.apiHandlers`
map in `module-design.md` is the source of truth — this file describes
wire shapes.

## Public endpoints (no credential required)

### `POST /api/auth/login`

Request:
```json
{ "email": "user@clinic.com", "password": "..." }
```

Success `200`:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 900,
  "user": { "id": 1, "email": "user@clinic.com", "name": "Jane", "defaultTenantId": 5 }
}
```

Errors: `AUTH_INVALID_CREDENTIAL` (404, same shape as "not found" to
prevent user enumeration), `AUTH_USER_INACTIVE` (401).

### `POST /api/auth/register`

Gated by `ALLOW_SELF_REGISTRATION` from `module-config`. If `false`,
responds `403 AUTH_SELF_REGISTRATION_DISABLED` and admins must invite
users through `POST /api/auth/api-keys` → `tenant_members`.

Request:
```json
{ "email": "new@clinic.com", "password": "...", "name": "New User" }
```

Password must satisfy `PASSWORD_MIN_LENGTH`. Emits
`auth.user.registered` on success.

### `POST /api/auth/refresh`

Trades a refresh token for a fresh access+refresh pair. The old
refresh token is invalidated (rotation). Reuse detection: if a
previously rotated refresh token is presented, the entire session
row is deleted and `AUTH_INVALID_TOKEN` is returned.

### `POST /api/auth/forgot-password`

Rate-limited per email. Always returns `200` even if the email does
not exist — no user enumeration. If it exists, creates a
`password_reset_tokens` row and emits `auth.user.passwordResetRequested`
which `module-notifications` listens for.

### `POST /api/auth/reset-password`

```json
{ "token": "...", "password": "new_password" }
```

Single-use: marks the reset token `usedAt`, updates the password hash
through the active adapter's `hashPassword`, and invalidates all
existing `auth_sessions` for the user.

## Authenticated endpoints

### `GET /api/auth/me`

Returns the current `AuthContext`:
```json
{
  "userId": 1,
  "email": "user@clinic.com",
  "name": "Jane",
  "tenantId": 5,
  "tenantMemberships": [{ "tenantId": 5, "role": "admin" }],
  "roles": [{ "id": 2, "name": "Clinic Admin" }],
  "permissions": ["kb-entries.read", "kb-entries.create", "..."],
  "authMethod": "jwt"
}
```

### `POST /api/auth/logout`

Invalidates the current session row. Cookie-based callers also get a
`Set-Cookie` with `Max-Age=0`.

### `GET /api/auth/sessions`

List the current user's active sessions. Used by the profile page to
show "Active sessions" with device + IP + `revoke` button.

### `DELETE /api/auth/sessions/[id]`

Revoke a specific session. Permission: owner only.

### `GET /api/auth/api-keys`

List API keys owned by the current user, with `keyHash` redacted.
Uses `parseListParams` + `listResponse` (Rule 10.1) with an allowlist
sort via the `getOrderColumn` helper introduced in
`oven-bug-sprint/sprint-05-handler-typesafety` — sprint-03 of this
module depends on that helper having shipped.

### `POST /api/auth/api-keys`

Create an API key. Request:
```json
{
  "name": "ci-pipeline",
  "tenantId": 5,
  "permissions": ["kb-entries.read"],
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

Returns the plaintext key **once**:
```json
{
  "id": 42,
  "plaintext": "oven_1a2b3c4d...",
  "keyPrefix": "oven_1a2",
  "createdAt": "..."
}
```

### `DELETE /api/auth/api-keys/[id]`

Hard-deletes the row. Audit trail is `auth.apiKey.revoked`.

## Shared envelope

Every list response uses `listResponse(data, total)` so clients
receive:

```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "pageSize": 25
}
```

Every error uses `errorResponse(code, message)`:

```json
{
  "error": { "code": "AUTH_PERMISSION_DENIED", "message": "Missing permission: api-keys.create" }
}
```
