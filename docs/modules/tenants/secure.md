# Module Tenants — Security

## Threat model

| Threat | Mitigation |
|---|---|
| Tenant enumeration via id probing | Public composition endpoint is slug-only, numeric id never exposed (**gap**: currently leaked in `id` field; tracked sprint-03). |
| Tenant enumeration via slug probing | Public endpoint returns 404 for unknown AND disabled slugs with identical response time (blank body, constant-time shape). |
| Cross-tenant member access | All member queries filter by `tenantId`; handlers check `permissions.has('tenant-members.read')` OR membership in the target tenant. RLS policies planned sprint-03. |
| Privilege escalation via role forge | POST/PUT reject any `role` outside the `TenantRole` enum at the handler layer; platform-admin check bypasses member-count guards only, not the enum gate. |
| Last-owner removal | POST/DELETE on `tenant_members` rejects the removal/role-change if it would leave a tenant with zero owners (R2.3). |
| Public endpoint amplification DDoS | Rate limit: `30 req/min/ip` + burst `10` at the platform middleware. Configurable via `tenants.RATE_LIMIT_PUBLIC_PER_MIN` and `tenants.RATE_LIMIT_PUBLIC_BURST`. |
| Slug collision on concurrent creates | DB-level `UNIQUE(slug)` — second creator gets `409 Conflict`. No race window. |
| Metadata JSONB abuse | R1.5 forbids putting tenant settings in `metadata`. Enforcement is by code review, not runtime — no generic check possible. |
| Event-bus injection via user input | Event payloads are assembled from DB rows, not request bodies. The `role` field is validated against `TenantRole` before it reaches an event. |
| SQL injection via sort field | Handlers use the F-05-01 `getOrderColumn(table, field, allowlist)` pattern from `module-ai`. A copy is planned for `module-tenants` sprint-02 after the helper moves to `module-registry`. |
| Timing side channel on slug existence | Public endpoint performs the `SELECT` + `resolve-batch` + `computeBusinessHours` pipeline on every request. Missing rows return 404 after roughly the same path length — not constant-time but close enough given the rate limit. |
| Disabled tenant data leak | `enabled = true` filter in the public handler — audit checks in R8.1. Unit test covers the filter. |

## Row-level security (planned)

RLS is off today. Target policies:

### `tenants`

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Platform admins see every row
CREATE POLICY tenants_platform_admin_all ON tenants
  FOR ALL
  USING (current_setting('app.role', true) = 'platform_admin');

-- Authenticated members see their own tenant rows
CREATE POLICY tenants_member_read ON tenants
  FOR SELECT
  USING (
    id = ANY (
      string_to_array(
        coalesce(current_setting('app.tenant_ids', true), ''),
        ','
      )::int[]
    )
  );

-- Public endpoint uses a SECURITY DEFINER function that bypasses RLS
CREATE FUNCTION public_tenant_by_slug(slug_in text)
  RETURNS SETOF tenants
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT * FROM tenants
    WHERE slug = slug_in AND enabled = true;
  $$;

REVOKE EXECUTE ON FUNCTION public_tenant_by_slug FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_tenant_by_slug TO web_anon;
```

### `tenant_members`

```sql
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tm_platform_admin_all ON tenant_members
  FOR ALL
  USING (current_setting('app.role', true) = 'platform_admin');

CREATE POLICY tm_self_read ON tenant_members
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::int);

CREATE POLICY tm_tenant_admin_all ON tenant_members
  FOR ALL
  USING (
    tenant_id = ANY (
      string_to_array(
        coalesce(current_setting('app.tenant_ids', true), ''),
        ','
      )::int[]
    )
    AND current_setting('app.role', true) IN ('tenant_admin', 'tenant_owner')
  );
```

The middleware that sets `app.role`, `app.user_id`, and `app.tenant_ids`
will ship with `module-auth` sprint-02. Until then, RLS stays off and
handler-layer permission checks are the only gate.

## Audit trail

Every write handler emits a structured log line:

```
{
  level: 'info',
  module: 'tenants',
  action: 'tenant.update' | 'tenant.delete' | 'member.add' | ...,
  tenantId: number,
  actorUserId: number,
  before: { ... } | null,
  after: { ... } | null,
  timestamp: ISO-8601,
}
```

Logs sink to the platform logger (Datadog in prod, stdout in dev). The
public composition endpoint does NOT log per-request — the rate limiter
captures the metrics it needs.

## Known gaps — routed to sprints

| Gap | Sprint | Notes |
|---|---|---|
| `id` leaked in public endpoint response | sprint-03 | Remove `id` from `tenants-public.handler.ts` response assembler. |
| RLS policies not applied | sprint-03 | Requires `module-auth` middleware to set GUCs; cross-module dependency. |
| No integration tests for handlers | sprint-02 | Wire a `NextRequest` harness. |
| Optimistic concurrency check missing on PUT | sprint-03 | Add `updated_at` guard. |
| Sort-field allowlist not yet applied | sprint-02 | Copy F-05-01 pattern once helper moves to `module-registry`. |
| Last-owner check missing on PUT (role change) | sprint-02 | R2.3 applies to both role change and removal. |
| `MAX_MEMBERS_PER_TENANT` enforcement missing on POST members | sprint-02 | R4.5 — check count before insert. |

## OWASP mapping

| OWASP category | Status |
|---|---|
| A01 Broken Access Control | PARTIAL — handler-layer permission checks work; RLS pending. |
| A02 Cryptographic Failures | N/A — this module stores no secrets. |
| A03 Injection | PASS — Drizzle parameterises all queries. Sort-field allowlist pending but low-risk (Drizzle column references, not raw SQL). |
| A04 Insecure Design | PARTIAL — slim table is good; last-owner check and member-count gate are missing. |
| A05 Security Misconfig | N/A — no framework config changes here. |
| A06 Vulnerable Components | tracked centrally via `pnpm audit`. |
| A07 Identification & Auth | deferred to `module-auth`. |
| A08 Software & Data Integrity | PASS — event bus schema is typed, payloads are immutable. |
| A09 Logging & Monitoring | PASS — audit log line per write. |
| A10 SSRF | N/A — no outbound HTTP to user-supplied URLs. |
