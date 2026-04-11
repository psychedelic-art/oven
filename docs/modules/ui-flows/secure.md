# UI Flows -- Security

## Threat model

The `ui-flows` module is unusual within OVEN: most of its surface is public. Patients visit tenant portals without any authentication, and every public endpoint under `/api/portal/[tenantSlug]/*` is reachable by an anonymous visitor. This inverts the default OWASP priorities: injection and XSS risks dominate, while broken access control is concentrated in the authenticated admin routes.

## 1. Tenant isolation (`docs/modules/13-tenants.md`)

Every authenticated handler reads `x-tenant-id` from the request and applies it as a filter on `uiFlows.tenantId`. Handlers never trust `tenantId` from the request body on writes -- the write path always takes `tenantId` from the `x-tenant-id` header populated by the dashboard's session middleware.

Platform-level admins (no `x-tenant-id` header) bypass the filter. This is intentional so that ops can list flows across tenants; callers without the platform admin role never reach this code path because upstream middleware rejects missing headers.

`ui_flow_pages` and `ui_flow_analytics` denormalize `tenant_id` so that read queries can filter directly, avoiding the join to `ui_flows` that would otherwise be a subtle source of tenant leakage.

## 2. Public endpoint hardening

Four routes are declared public in `api_endpoint_permissions` via the seed:

| Route                                           | Method | Rate limit            |
|-------------------------------------------------|--------|-----------------------|
| `/api/portal/[tenantSlug]`                      | GET    | 120 req/min per IP    |
| `/api/portal/[tenantSlug]/pages/[pageSlug]`     | GET    | 240 req/min per IP    |
| `/api/portal/[tenantSlug]/theme`                | GET    | 60 req/min per IP     |
| `/api/portal/[tenantSlug]/analytics`            | POST   | 60 req/min per visitorId cookie |

Rate limits are enforced in the shared API middleware (`@oven/module-registry/api-utils`). The analytics endpoint additionally validates `eventType` against an allow-list before writing.

Public handlers only return the subset of columns intended for the portal -- no `tenantId`, no internal config keys, no custom CSS when `ENABLE_CUSTOM_CSS=false`. This prevents information disclosure via public reconnaissance.

## 3. Injection

**SQL**: all database access goes through Drizzle. No string-concatenated SQL. The `search` query parameter on the analytics list uses Drizzle's `ilike` with parameter binding.

**JSON**: `definition`, `themeConfig`, and `domainConfig` are stored as JSONB. On write, the handler parses the body via `request.json()` and hands the resulting object directly to Drizzle; Drizzle escapes properly. Handlers do not string-format JSON into SQL.

**NoSQL**: not applicable (Postgres only).

## 4. Cross-site scripting (XSS)

**Theme custom CSS** (`themeConfig.customCss`) is the highest XSS surface. Mitigations:

1. The feature is gated by `ENABLE_CUSTOM_CSS` (defaults to `false`).
2. On save, the editor runs the CSS through a whitelist validator that allows only `@media`, `:root`, and simple selectors; rejects `@import`, `url(javascript:...)`, and `expression(...)`.
3. The portal injects the CSS inside `<style>{customCss}</style>` -- not as an inline style attribute -- so it cannot execute JS directly.
4. All theme URLs (`logoUrl`, `faviconUrl`, `heroImage`) are validated against an allow-list of `module-files` domains.

**Form content**: forms rendered inside portals go through the published GrapeJS output from `module-forms`. GrapeJS escapes user input at publish time; the portal does not re-evaluate templates at runtime.

**FAQ content**: FAQ entries from `module-knowledge-base` are already sanitized at the KB layer. The portal renders them via React, which escapes text by default.

**Page titles / descriptions**: set by tenant admins; trusted because those admins are authenticated.

## 5. Cross-site request forgery (CSRF)

Authenticated admin routes follow the dashboard's standard CSRF strategy (session cookie + `X-Requested-With` header enforcement). Public portal routes are effectively idempotent reads or accept only a single analytics event with a cookie-backed visitor ID, which is not a useful CSRF target.

## 6. Server-side request forgery (SSRF)

No server-side URL fetching on behalf of user input. The custom domain verification job reads DNS TXT records using a DNS resolver, not an HTTP client, so SSRF is not reachable through that path.

## 7. Broken access control

Every authenticated handler checks a specific permission:

| Handler                          | Required permission    |
|----------------------------------|------------------------|
| `ui-flows.handler (GET)`         | `ui-flows.read`        |
| `ui-flows.handler (POST)`        | `ui-flows.create`      |
| `ui-flows-by-id (GET)`           | `ui-flows.read`        |
| `ui-flows-by-id (PUT)`           | `ui-flows.update`      |
| `ui-flows-by-id (DELETE)`        | `ui-flows.delete`      |
| `ui-flows-publish`               | `ui-flows.publish`     |
| `ui-flows-versions (GET)`        | `ui-flows.read`        |
| `ui-flows-versions-restore`      | `ui-flows.update`      |
| `ui-flow-pages`                  | `ui-flows.read`        |
| `ui-flow-analytics`              | `ui-flow-analytics.read` |

The permission check runs before the tenant filter. A user with `ui-flows.read` but the wrong `tenantId` still sees an empty list rather than an error, preserving the "cannot discover other tenants" property.

## 8. Authentication boundaries (`docs/modules/17-auth.md`)

The dashboard session middleware populates `x-tenant-id` from the authenticated user's tenant binding. The portal has no authentication and does not set `x-tenant-id`; instead, `tenantSlug` comes from the URL and is resolved server-side against the `tenants` table.

The dashboard and the portal share the same Postgres schema but never share session cookies. The portal's Next.js `apps/portal` app has its own cookie namespace (`portal-visitor`) used only for analytics visitor IDs.

## 9. Custom domain verification

Tenants registering a custom domain must:
1. Add a TXT record matching `oven-domain-verify=<random-token>` to the DNS zone.
2. Wait for the verification job to resolve the TXT record and match the token.
3. The job then flips `domainConfig.customDomainVerified=true`.

Unverified domains are never routed to. This prevents tenants from hijacking each other's domains and from claiming domains they do not own.

## 10. RLS notes

Postgres row-level security policies live in the tenancy migration under `docs/modules/13-tenants.md`. For `ui-flows`:

```sql
ALTER TABLE ui_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY ui_flows_tenant_isolation ON ui_flows
  USING (tenant_id = current_setting('app.tenant_id')::integer);

ALTER TABLE ui_flow_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ui_flow_pages_tenant_isolation ON ui_flow_pages
  USING (tenant_id = current_setting('app.tenant_id')::integer);

ALTER TABLE ui_flow_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY ui_flow_analytics_tenant_isolation ON ui_flow_analytics
  USING (tenant_id = current_setting('app.tenant_id')::integer);
```

`ui_flow_versions` inherits isolation via the `ui_flow_id` -> `ui_flows.tenant_id` join. A future policy may denormalize tenant_id onto this table if query patterns demand it.

## 11. Audit logging

Every write emits a structured event (`ui-flows.flow.created` etc). A future audit module will ingest these events and persist them. No PII is included in event payloads.

## 12. OWASP Top 10 (2021) mapping

| Risk                               | Coverage                                                   |
|------------------------------------|------------------------------------------------------------|
| A01: Broken Access Control         | Permission checks + tenant filter on every authed handler. |
| A02: Cryptographic Failures        | Sessions rely on dashboard's own crypto; no module-owned secrets. |
| A03: Injection                     | Drizzle parameter binding; allow-listed analytics event types. |
| A04: Insecure Design               | Draft/publish separation; immutable version snapshots.    |
| A05: Security Misconfiguration     | `ENABLE_CUSTOM_CSS` and `ENABLE_CUSTOM_DOMAINS` gated defaults. |
| A06: Vulnerable Components         | ReactFlow, Next.js, MUI tracked via root lockfile.        |
| A07: Identification/Auth Failures  | No module-owned auth; delegated to `module-auth`.          |
| A08: Software/Data Integrity       | Version snapshots; restore captured as a new version.     |
| A09: Logging and Monitoring        | Structured event emissions on every write.                 |
| A10: SSRF                          | No user-driven server-side HTTP fetches.                  |
