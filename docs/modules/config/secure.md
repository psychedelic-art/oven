# Module Config -- Security

> RLS, permissions, threat model, and OWASP checklist.

---

## Permissions

Seeded by `packages/module-config/src/seed.ts`:

| Slug | Resource | Action | Used by |
|------|----------|--------|---------|
| `module-configs.read` | module-configs | read | `GET /api/module-configs`, `.../resolve`, `.../resolve-batch`, `.../[id]` |
| `module-configs.create` | module-configs | create | `POST /api/module-configs` (insert path) |
| `module-configs.update` | module-configs | update | `POST /api/module-configs` (update path), `PUT /api/module-configs/[id]` |
| `module-configs.delete` | module-configs | delete | `DELETE /api/module-configs/[id]` |

These are registered via an idempotent seed (Rule 5.5). The auth middleware
in `module-auth` maps the slug to the required permission and returns 403 if
absent.

---

## RLS Policies (sprint-03)

```sql
ALTER TABLE module_configs ENABLE ROW LEVEL SECURITY;

-- 1. Superadmin bypass
CREATE POLICY module_configs_admin ON module_configs
  FOR ALL
  USING (current_setting('app.current_role', true) = 'superadmin');

-- 2. Tenants: read own rows + platform-global fallbacks
CREATE POLICY module_configs_tenant_read ON module_configs
  FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant_id', true)::int
  );

-- 3. Tenants: insert only into their own rows
CREATE POLICY module_configs_tenant_write ON module_configs
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::int);

-- 4. Tenants: update only their own rows
CREATE POLICY module_configs_tenant_update ON module_configs
  FOR UPDATE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::int);

-- 5. Tenants: delete only their own rows
CREATE POLICY module_configs_tenant_delete ON module_configs
  FOR DELETE
  USING (tenant_id = current_setting('app.current_tenant_id', true)::int);
```

### Session Variables

Set by `module-auth` middleware on every request before any query runs:

| Variable | Type | Value |
|----------|------|-------|
| `app.current_tenant_id` | int | The authenticated user's active tenant ID (or 0 for admin) |
| `app.current_role` | text | `superadmin`, `admin`, `member`, etc. |

If the middleware fails to set these, the policies deny all reads and the
request returns an empty list -- fail-closed by design.

---

## Threat Model

### T1 -- Cross-tenant read

**Vector**: tenant A crafts a query with `filter[tenantId]=B` in hope of
reading tenant B's rows.

**Defence**:

1. RLS policy `module_configs_tenant_read` rejects at the DB level.
2. The list handler applies handler-level filtering based on the
   authenticated tenant context.
3. Integration test in sprint-03 proves both layers independently.

### T2 -- Credential leakage via `value`

**Vector**: a config entry holds a provider credential in plaintext (`value`
= `{"accountSid": "AC...", "authToken": "..."}`). An attacker with read
access to one tenant's rows attempts to read another tenant's credentials.

**Defence**:

1. RLS per T1 blocks the DB read.
2. Audit suggestion (future sprint): offer an `encrypted: true` flag that
   triggers KMS-side encryption for sensitive values. Not in current scope.
3. Dashboard UI redacts values whose `key` matches `/SECRET|TOKEN|KEY|PASSWORD/`
   in list view. This is a UI nicety, not a security boundary.

### T3 -- Priority inversion as a logic vulnerability

**Vector**: a bug in the cascade resolver causes a lower-tier value to win,
e.g. returning a platform default when a tenant-specific override exists.
This is not an auth vulnerability, but it can surface tenant-specific data
(e.g. an old provider token) to the wrong tenant.

**Defence**:

1. Unit tests in sprint-01 cover every tier transition explicitly.
2. Each response includes the `source` tier so monitoring can alert on
   unexpected sources for sensitive keys.

### T4 -- SQL injection via `filter[q]` or `key` params

**Vector**: attacker injects SQL through the search param.

**Defence**: Drizzle's parameterised queries. The `ilike` call uses a
template string but the user input is passed as a parameter, not
concatenated. Grep of `module-configs.handler.ts` confirms no raw SQL
construction.

### T5 -- Event bus leakage

**Vector**: `config.entry.updated` emits `oldValue` and `newValue`. If a
listener in a different tenant's context subscribes, it might receive
another tenant's secret.

**Defence**: the EventBus is in-process within the dashboard app. No
cross-tenant listeners exist by construction. For cross-node event routing
(future), wirings MUST filter by `tenantId` before firing any downstream
action. This is enforced by rule 5.6 (tenantId in every event payload).

---

## OWASP Top 10 Checklist

| Category | Status | Notes |
|----------|:------:|-------|
| A01 Broken Access Control | PASS (sprint-03 gated) | RLS + handler filters + permissions. |
| A02 Cryptographic Failures | PARTIAL | Values are stored in plaintext JSONB. Flagged in T2 for a future encryption sprint. Platform-owner operational responsibility in the interim. |
| A03 Injection | PASS | Drizzle parameterised queries. |
| A04 Insecure Design | PASS | Cascade is deterministic; priority order is in code and tested. |
| A05 Security Misconfiguration | PASS | RLS migration is part of the module's own migration pipeline. |
| A06 Vulnerable Components | PASS | Depends only on drizzle-orm, next, `@oven/module-registry`. |
| A07 Identification / Auth Failures | N/A | Handled by `module-auth`. |
| A08 Software / Data Integrity | PASS | Upsert is transactional; COALESCE unique index prevents duplicates. |
| A09 Security Logging | PARTIAL | `config.entry.*` events log every mutation. No centralized audit sink yet -- flagged for ops. |
| A10 SSRF | N/A | Config does not make outbound HTTP calls. |

---

## Hard Rules

- **Never** log `value` at `info` level for keys that look like credentials.
- **Never** return tier-5 `schema` values in a write path (no pseudo-commits).
- **Never** run the `_tenant_write` / `_tenant_update` / `_tenant_delete`
  policies with an unset `app.current_tenant_id` -- they will throw on the
  `::int` cast, which is a fail-closed safeguard.
- **Never** disable RLS for a migration without also setting
  `SET LOCAL ROLE postgres` in the same transaction.
