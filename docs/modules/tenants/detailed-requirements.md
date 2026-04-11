# Module Tenants — Detailed Requirements

## R1 — Identity shape

**R1.1** The `tenants` table MUST have exactly these columns: `id`,
`name`, `slug`, `enabled`, `metadata`, `createdAt`, `updatedAt`.
Any other column is a Rule-13 violation unless it holds identity (not
configuration) and is explicitly justified in this document.

**R1.2** `slug` MUST be unique across the whole table. The DB-level
UNIQUE constraint is the authoritative enforcement point.

**R1.3** `slug` SHOULD match `^[a-z0-9-]{1,128}$` — lower-kebab only.
Enforcement is at the handler layer; the DB accepts any string up to
128 chars for historical compatibility.

**R1.4** `enabled` defaults to `true` on insert. Soft-delete sets
`enabled = false` — the row is never `DELETE`d from `tenants` so
history (usage logs, executions, messages) remains addressable by id.

**R1.5** `metadata` is for internal OVEN operations only. It MUST NOT
be used as a dumping ground for tenant-customizable config. Any new
entry under `metadata` must be justified in a code-review comment
citing R1.5.

## R2 — Membership

**R2.1** `tenant_members` rows are uniquely keyed on
`(tenant_id, user_id)` — a user cannot hold two memberships in the
same tenant.

**R2.2** `role` accepts `owner`, `admin`, `member`. Other values are
rejected at the handler layer with `400`.

**R2.3** Deleting the last `owner` of a tenant is blocked — the
handler rejects with `409 Conflict` and the UI shows an inline error.
Ownership must be transferred first via `PUT /api/tenant-members/[id]`
with a new role, then the original owner's membership can be removed.

**R2.4** Platform admins (`platform_admin` role from `module-auth`)
have full member management rights on every tenant, bypassing R2.3.

## R3 — Public composition endpoint

**R3.1** `GET /api/tenants/[slug]/public` is the **only** unauthenticated
endpoint in this module.

**R3.2** It MUST return 404 for disabled tenants. Disabled tenants must
not leak configuration to unauthenticated callers.

**R3.3** The response shape MUST remain backward-compatible with the
legacy thick-tenant row. Consumers (portal, chat widget, external
integrations) should never see a field disappear.

**R3.4** The endpoint MUST compute `isBusinessHours` server-side using
the resolved `SCHEDULE` + `TIMEZONE`. Clients MUST NOT be asked to
compute it themselves because of clock-skew and timezone-library
versions drift.

**R3.5** The endpoint MUST NOT leak the numeric `id` of the tenant in
the public payload (only `slug` + display name + config). Rationale:
numeric ids let callers probe the id space; slugs are already public.

> **Gap note**: the current handler DOES include `id` in the response.
> Flagged in the todo sprint plan as a sprint-03 security fix.

## R4 — Config storage

**R4.1** Every operational setting (schedule, timezone, branding,
tone, welcome messages, services, payment methods, emergency
instructions, scheduling url) MUST live in `module_configs` under
`moduleName='tenants'`, not as columns on `tenants`.

**R4.2** Config reads MUST go through `module-config`'s
`resolve-batch` or `resolve` endpoints so the 5-tier cascade
(tenant-instance > tenant-module > instance-default > module-default >
platform-default) applies uniformly.

**R4.3** Every declared config key MUST be listed in
`tenantsModule.configSchema`. The schema is the contract; the
dashboard config tab renders its inputs from it.

**R4.4** All 15 config keys are `instanceScoped: true`. A tenant can
override each key per tenant instance; platform defaults fill in when
the tenant has not set anything.

**R4.5** `MAX_MEMBERS_PER_TENANT` is a platform-level default
(defaultValue `50`) that can be overridden per tenant instance. The
`POST /api/tenant-members` handler MUST check it before inserting.

## R5 — Events

**R5.1** Five events MUST be emitted on successful writes:
`tenants.tenant.created`, `tenants.tenant.updated`,
`tenants.tenant.deleted`, `tenants.member.added`,
`tenants.member.removed`. Every payload MUST match the schema in
`tenantsModule.events.schemas`.

**R5.2** Events MUST be emitted **after** DB commit. A failed emission
does not roll back the write.

**R5.3** Event schemas are frozen — a payload field cannot be renamed
or removed without a major version bump of the module. Additive
changes (new fields) are allowed.

## R6 — Permissions & seed

**R6.1** Seven permissions MUST be registered by `seedTenants()`:
`tenants.read`, `tenants.create`, `tenants.update`, `tenants.delete`,
`tenant-members.read`, `tenant-members.create`,
`tenant-members.delete`. All inserts use `onConflictDoNothing()` for
idempotency.

**R6.2** `GET /api/tenants/[slug]/public` MUST be seeded as a public
endpoint in `api_endpoint_permissions` with `isPublic: true`. All
other endpoints require the matching permission.

**R6.3** `seedTenants()` MUST be idempotent — running it twice on the
same database produces the same state with no duplicate rows.

## R7 — Dashboard UI

**R7.1** Tenant list, create, edit, show components live in
`apps/dashboard/src/components/tenants/` and use MUI `sx` only.

**R7.2** The edit form MUST be tabbed (Identity, Config, Schedule,
Services, Communication, Members). Identity writes go to `/api/tenants`;
Config writes go to `/api/module-configs`. The two surfaces never
share a single Save button.

**R7.3** Config reads MUST be batched via `resolve-batch` — one
request for the whole tab.

**R7.4** The business-hours strip on the Show view MUST refresh every
60 s and visibly flip when the tenant transitions from open to closed
(and vice versa).

**R7.5** Delete (soft delete) MUST require a confirmation dialog with
the tenant slug typed as a verification.

## R8 — Security

**R8.1** The public composition endpoint MUST filter `enabled = true`
before returning data.

**R8.2** The public endpoint MUST NOT expose any field declared
`sensitive` in the config schema. (No current keys are sensitive, but
the check is a gate against future drift.)

**R8.3** RLS policies on `tenants` and `tenant_members` are planned
but not yet live. The gap is tracked in the todo sprint plan.

**R8.4** Cross-tenant reads from authenticated callers MUST check
`permissions.has('tenants.read')` — callers without it can only read
tenants they are a member of. Today the check is ad-hoc in each
handler; a middleware unification is routed through the
`dashboard-ux-system` tenant-context sprint.

## R9 — Testing

**R9.1** `computeBusinessHours` MUST be unit-tested with coverage for:
- inside the open window (true)
- before open (false)
- after close (false)
- day missing from schedule / closed day (false)
- null / undefined schedule (false)
- null / undefined timezone (false)
- midnight boundary (`"00:00"` to `"23:59"`)
- schedule that wraps past midnight (false for now — enhancement planned)
- invalid timezone string (false via `Intl` throwing)
- day-of-week values in multiple locales (American English weekdays
  match `Intl.DateTimeFormat` output in every supported OS locale
  because the formatter is pinned to `en-US`).

**R9.2** Every handler MUST be integration-tested at the `NextRequest`
level. No integration test harness exists yet in this module — routed
as a sprint-02 task.

**R9.3** Seed idempotency MUST be covered by a test that runs the
seed twice and asserts row counts are equal.

## R10 — Observability

**R10.1** Every write handler logs a structured audit record via the
registry logger: `{ action, tenantId, actorUserId, before?, after? }`.

**R10.2** The public endpoint emits no audit record — it is public
and high-traffic; audit logs would be noise. Access is tracked through
the platform rate limiter's metrics instead.
