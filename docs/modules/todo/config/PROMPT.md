# Module Config — Authoring Prompt

> The north-star brief used to seed this module and every sprint that follows.

## Mission

Build a **platform-wide configuration store** for OVEN that gives every module
a single place to declare, store, and resolve tenant-customizable settings. The
store must be tenant-aware, RLS-protected, schema-default-backed, and
batch-resolvable.

## Non-Negotiable Requirements

1. **5-tier cascade resolution** in strict priority order:
   1. Tenant instance override (`tenantId = N, scope='instance', scopeId=X`)
   2. Tenant module default (`tenantId = N, scope='module', scopeId=NULL`)
   3. Platform instance override (`tenantId = NULL, scope='instance', scopeId=X`)
   4. Platform module default (`tenantId = NULL, scope='module', scopeId=NULL`)
   5. Schema default from the module's `configSchema` array in code.
2. **Single table** (`module_configs`) with plain-integer foreign keys and a
   COALESCE-based unique index over
   `(COALESCE(tenant_id,0), module_name, scope, COALESCE(scope_id,''), key)`.
3. **RLS** enforced at the DB level with two axes: role (`superadmin` bypass)
   and tenant (`tenant_id IS NULL OR tenant_id = current_tenant`).
4. **Batch resolve** endpoint that accepts a comma-separated `keys` param and
   returns all values in a single call. The public tenant config endpoint
   will consume this to resolve ~14 keys in one round-trip.
5. **Idempotent upsert** semantics on `POST /api/module-configs` — if the
   `(tenantId, moduleName, scope, scopeId, key)` tuple exists, update; else
   insert. Emit `config.entry.created` / `config.entry.updated` events.
6. **Module-rules compliance** (all 12 rules) — registered, discoverable,
   pluggable, loosely coupled, tenant-scoped + RLS, UX-friendly, no cross-module
   imports, plain integer FKs, per-tenant indexes, seeded permissions.
7. **No cross-module imports** — consumers call
   `GET /api/module-configs/resolve` rather than importing resolver code.

## Out of Scope (forever)

- A JavaScript-side schema validator for config values. Values are JSON blobs
  by design; the consuming module validates at read time with its own Zod
  schema if needed.
- Hierarchy-node scoping (`hierarchyNodeId` on `module_configs`). Tenant +
  instance is sufficient. Hierarchy scoping is solved at a different layer.
- Revision history / audit log. Event log via `config.entry.updated` is
  sufficient; if full audit is ever needed, it is a separate module.
- A config diff/merge UI. Superadmins edit individual keys; conflicts are
  resolved by the cascade, not by a merge tool.

## Consumers (Ordered by Coupling)

1. **module-tenants** — operational config per tenant (schedule, tone,
   business name, timezone, locale).
2. **module-subscriptions** — tenant-scoped provider credentials and plan
   overrides.
3. **module-notifications** — channel-specific settings (Twilio account SID,
   Meta WhatsApp token) resolved per tenant.
4. **module-knowledge-base** — embedding model, max entries, similarity
   threshold.
5. **module-agent-core** — default agent settings resolved per tenant.
6. **module-workflows** — execution settings (this module previously owned
   the table; the migration removes it and makes `module-workflows` a
   consumer instead).
7. **module-ai** — provider model + temperature per tenant.
8. **All modules** — every module's declared `configSchema` defaults become
   tier-5 fallbacks.

## Reference Implementations (for the approach, not the code)

- **AWS Systems Manager Parameter Store** — hierarchical key-value config with
  `/path/to/key` semantics; inspired the `scope` + `scopeId` tuple.
- **HashiCorp Consul KV** — tenant/namespace scoping via a path prefix.
- **Spring Cloud Config Server** — cascading profile resolution (default →
  application → profile) directly parallels the 5-tier cascade.
- **Kubernetes ConfigMaps with namespace scoping** — namespace =
  `tenantId`, key = `key`.

## Success Signals

1. Dashboard lists/creates/edits config entries for any registered module with
   no per-module code changes.
2. `module-tenants` stops defining its own config columns and reads operational
   settings through `GET /api/module-configs/resolve-batch`.
3. The public tenant config endpoint serves ~14 keys in < 50ms (single DB round
   trip thanks to batch resolve).
4. A config edit for tenant A does not affect tenant B (enforced by unique
   index, RLS policy, and handler-level filtering — defence in depth).

## Failure Signals

1. A tenant can read another tenant's config row (missing RLS or missing
   handler-level filter).
2. Cascade returns a lower-priority value when a higher-priority one exists
   (priority inversion — indicates a bug in the resolver).
3. Upsert creates a duplicate row instead of updating an existing one (unique
   index missing or handler logic flawed).
4. Schema default (tier 5) is returned as a persisted value in an event — tier
   5 values should never emit `config.entry.created`.
