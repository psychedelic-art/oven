# Module Config -- Use-Case Compliance

> Traces `docs/use-cases.md` scenarios to concrete `module-config` behaviours.

---

## UC 1 -- Initial Platform Setup

**Actor**: superadmin provisioning OVEN for a new deployment.

**Flow**:

1. Superadmin logs into the dashboard.
2. Navigates to **Platform → Module Configs**.
3. Creates platform-global rows (`tenantId IS NULL, scope='module'`) for
   every key referenced in any module's `configSchema[]`. In practice they
   iterate through the registered modules shown in the module dropdown and
   fill in the "seed data" columns.
4. The cascade resolver will now return these values at tier 4 for every
   tenant, falling through to tier 5 only for keys the superadmin forgot.

**Config's contribution**: The module provides the CRUD surface, the
`config.entry.created` events to feed any monitoring, and the fallback to
tier 5 for anything the admin misses.

---

## UC 2 -- Onboard a Tenant

**Actor**: superadmin provisioning a new tenant (for example, a new dental
clinic).

**Flow**:

1. Superadmin creates the tenant record via `module-tenants`.
2. Superadmin creates tenant-scoped rows (`tenantId = N, scope='module'`)
   for operational keys: `SCHEDULE`, `TIMEZONE`, `BUSINESS_NAME`, `TONE`,
   `SUPPORT_EMAIL`, `SUPPORT_PHONE`, etc.
3. The tenant portal loads; the public tenant config endpoint calls
   `config.resolveBatch` with 14 keys and gets the effective configuration
   back in a single round trip.

**Config's contribution**: Tier-2 rows are the primary mechanism for
per-tenant customisation. `config.resolveBatch` is the hot path for
portal bootstrap; its P95 latency target is < 80ms.

---

## UC 3 -- Configure a Tenant (Day-2 Operations)

**Actor**: tenant admin (restricted access) or platform operator.

**Flow**:

1. User navigates to Module Configs filtered to `tenantId = their own`.
2. Edits a row (e.g. changes `TONE` from `formal` to `friendly`).
3. The PUT handler fires, emits `config.entry.updated`, and the public
   tenant config endpoint returns the new value on the next request.

**Config's contribution**: RLS policy `module_configs_tenant_update`
enforces that the tenant user can only edit their own rows. The event
payload carries both old and new values so listeners can react.

---

## UC 4 -- Set Up Provider Credentials

**Actor**: superadmin or tenant admin configuring a notification adapter
(Twilio, Meta WhatsApp, etc.).

**Flow**:

1. Creates tenant-scoped rows with keys like
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `META_WA_TOKEN` under
   `moduleName = 'notifications'`.
2. The next outbound message resolves these values via
   `config.resolve` with the tenant ID, gets the tenant's credentials,
   and calls the adapter.

**Config's contribution**: Acts as the tenant-scoped credential store.
See [`secure.md`](./secure.md) T2 for the credential-leakage threat model
and why the current sprint ships with plaintext JSONB (future encryption
sprint is flagged).

---

## UC 8 -- Override Config for One Tenant

**Actor**: superadmin responding to a support request ("tenant 42 needs a
higher send limit").

**Flow**:

1. Superadmin opens Module Configs.
2. Clicks "Create" and fills in `tenantId = 42`, `moduleName =
   notifications`, `scope = module`, `key = DAILY_SEND_LIMIT`,
   `value = 500`.
3. Save. Event `config.entry.created` fires. The cascade now returns
   tier-2 for tenant 42 (`tenant-module`) and still returns tier-4
   (`platform-module`) for every other tenant.

**Config's contribution**: The entire cascade exists for this use case.
Tier 2 shadows tier 4 for exactly one tenant without touching any other
row.

---

## UC 11 -- Manage Platform Defaults

**Actor**: superadmin.

**Flow**:

1. Superadmin opens Module Configs and filters to `tenantId IS NULL`.
2. Edits a platform default (e.g. changes `DEFAULT_TONE` from `neutral`
   to `friendly`).
3. All tenants that do not have a tier-2 override immediately receive the
   new value via tier 4.

**Config's contribution**: Tier-4 is the platform default. Editing it has
blast-radius equal to the count of tenants without overrides, which is
intentional and documented.

---

## Out-of-Scope Use Cases

| Use case | Reason |
|----------|--------|
| UC 5 -- Monitor Tenant Health | `module-tenants` + `module-notifications` own this. Config is read as input but not the primary actor. |
| UC 6 -- Export Tenant Data | Data export lives in a future sprint; config rows are part of the export but not the mechanism. |
| UC 7 -- Impersonate Tenant | `module-auth` owns this; config reads just happen to respect the impersonated session vars. |
| UC 9 -- Delete Tenant | Tenant deletion cascades to `module_configs` by a delete policy in `module-tenants`, not by config itself. |
| UC 10 -- Migrate Tenant Data | Out of scope for config. |
| UC 12-18 | No direct interaction with config. |

---

## Compliance Traceability

| Use case | Tier relied upon | Endpoint used |
|----------|------------------|---------------|
| UC 1 | 4 (platform-module) | `POST /api/module-configs` |
| UC 2 | 2 (tenant-module) | `POST /api/module-configs`, `GET .../resolve-batch` |
| UC 3 | 2, 4 | `PUT /api/module-configs/[id]` |
| UC 4 | 2 | `POST /api/module-configs`, `GET .../resolve` |
| UC 8 | 2 shadows 4 | `POST /api/module-configs` |
| UC 11 | 4 | `PUT /api/module-configs/[id]` |

Every use case is testable either in sprint-01 (resolver unit tests),
sprint-02 (dashboard walk-through), or sprint-03 (RLS integration test).
