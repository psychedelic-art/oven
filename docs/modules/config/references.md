# Module Config -- References

> External specifications, prior art, and design influences for the
> platform-wide configuration store.

---

## Cascade / Hierarchical Config Systems

### Spring Cloud Config Server

- **Documentation**: https://spring.io/projects/spring-cloud-config
- **Relevance**: Spring Cloud Config resolves values by walking a fixed
  priority list of property sources: `bootstrap` < `application` <
  `application-{profile}` < environment-specific overrides. The 5-tier
  cascade in this module is directly modelled on this priority-list pattern.
- **Key concept adopted**: "most specific wins" with short-circuit
  resolution on the first hit.

### AWS Systems Manager Parameter Store

- **Documentation**: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
- **Relevance**: Parameter Store stores hierarchical configuration using
  `/path/to/parameter` notation. Tenant-scoped resolution (this module's
  tier-2) is analogous to Parameter Store's hierarchical naming where a
  tenant prefix narrows the search. The `scope + scopeId` tuple is
  conceptually equivalent to a Parameter Store path suffix.
- **Key concept adopted**: explicit source metadata (`source: 'tenant-module'`
  mirrors Parameter Store's `Source` metadata).

### HashiCorp Consul KV

- **Documentation**: https://developer.hashicorp.com/consul/docs/dynamic-app-config/kv
- **Relevance**: Consul's KV store supports namespaced keys via path
  prefixes. Multi-tenant OVEN deployments conceptually partition
  `module_configs` by `tenant_id`, which plays the same role as a Consul
  namespace prefix. Consul's read-time fallback (read namespace, fall back
  to global) inspired the tenant-then-platform cascade.

### etcd

- **Documentation**: https://etcd.io/docs/
- **Relevance**: etcd's hierarchical key model and revision-aware reads
  influenced the "event per mutation" design (etcd's watch semantics map to
  this module's `config.entry.*` events). Config deliberately skips
  revisioning because the use case does not need rollback.

### Kubernetes ConfigMaps

- **Documentation**: https://kubernetes.io/docs/concepts/configuration/configmap/
- **Relevance**: A ConfigMap's namespace scoping is analogous to
  `tenant_id`. The ConfigMap-per-namespace pattern justifies storing
  tenant-specific rows next to platform defaults -- both are read by
  name, the read-time resolver decides which to return.

---

## Feature-Flag / Dynamic Config Services

### LaunchDarkly

- **Documentation**: https://docs.launchdarkly.com/
- **Relevance**: LaunchDarkly's targeting rules (segment > user > default)
  are a 3-tier cascade. The `scope: 'instance'` concept in this module is
  analogous to LaunchDarkly's per-user targeting, while `scope: 'module'`
  corresponds to the default rule. The 5-tier cascade is a superset with
  explicit tenant-vs-platform axes.

### Unleash

- **Documentation**: https://docs.getunleash.io/
- **Relevance**: Unleash's "strategy" abstraction (multiple activation
  strategies evaluated in order) informed the explicit priority-list
  approach over a composite query.

### Optimizely Rollouts / Flagsmith

- **Documentation**: https://flagsmith.com/
- **Relevance**: Flagsmith supports environment + segment + identity
  overrides. This module adopts a comparable priority model with explicit
  numbered tiers to keep the resolver auditable.

---

## Multi-Tenant Database Patterns

### Row-Level Security in PostgreSQL

- **Documentation**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Relevance**: The RLS policies in [`secure.md`](./secure.md) follow the
  official Postgres RLS idiom: enable RLS, create per-role policies with
  `USING` (read) and `WITH CHECK` (write) clauses, and rely on session
  variables set by the application for per-request context.

### Citus Distributed Postgres -- Multi-Tenant Patterns

- **Documentation**: https://docs.citusdata.com/en/stable/use_cases/multi_tenant.html
- **Relevance**: Citus's recommended multi-tenant approach (every tenant
  table has a `tenant_id` column, queries filter by `tenant_id`) matches
  rule 5.1 in this repo. Config follows the same pattern at the single-table
  level, without the sharding layer.

### CockroachDB -- Row-Level Security

- **Documentation**: https://www.cockroachlabs.com/docs/stable/row-level-security.html
- **Relevance**: Confirms that the RLS idiom ports to other Postgres-wire
  databases, so the module does not lock the platform into vendor-specific
  features.

---

## Drizzle & TypeScript References

### Drizzle ORM

- **Documentation**: https://orm.drizzle.team/docs/overview
- **Relevance**: Schema definitions, indexes, and the ergonomic query
  builder used by every handler in this module. The inability to express
  COALESCE-based unique indexes natively is documented in the Drizzle
  issue tracker and is the reason sprint-03 ships a raw-SQL migration.

### drizzle-orm/pg-core

- **Source**: https://github.com/drizzle-team/drizzle-orm/tree/main/drizzle-orm/src/pg-core
- **Relevance**: `pgTable`, `serial`, `integer`, `varchar`, `jsonb`,
  `timestamp`, and `index` are the only primitives used in
  `packages/module-config/src/schema.ts`.

### Next.js App Router -- Route Handlers

- **Documentation**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Relevance**: API handlers are exported from
  `packages/module-config/src/api/*.handler.ts` and mounted via thin
  re-exports in `apps/dashboard/src/app/api/module-configs/**/route.ts`.
  The `NextRequest` + `NextResponse` primitives used here are from this
  module.

---

## OVEN Platform References

- [`docs/module-rules.md`](../../module-rules.md) -- the 12 hard requirements
  every module follows. Config complies with rules 1-5, 8-12 and has sprint
  coverage for rules 6 (UX) and 5.3 (RLS).
- [`docs/package-composition.md`](../../package-composition.md) -- raw TS
  exports, thin route re-exports, plain integer FKs.
- [`docs/modules/00-overview.md`](../00-overview.md) -- module map showing
  config as Core Infrastructure.
- [`docs/modules/20-module-config.md`](../20-module-config.md) -- the
  authoritative spec. This doc is a summary and architectural view; the
  spec is canonical for field names, pseudocode, and migration SQL.
- [`docs/modules/13-tenants.md`](../13-tenants.md) -- tenant identity and
  the source of `current_tenant_id`.
- [`docs/modules/17-auth.md`](../17-auth.md) -- permission seeding and the
  middleware that sets RLS session vars.
- [`docs/use-cases.md`](../../use-cases.md) -- UC 1, 2, 3, 4, 8, 11 all
  depend on config.

---

## Standards

### JSON Schema

- **Specification**: https://json-schema.org/
- **Relevance**: Config values are JSONB. Each module's `configSchema[]`
  entry includes a `type` field (`string`, `number`, `boolean`, `object`,
  `array`) aligned with JSON Schema primitives. Future work may add a full
  schema validator at write time.

### HTTP Status Codes

- **Specification**: https://httpwg.org/specs/rfc9110.html
- **Relevance**: `200` success, `201` on insert, `400` on missing params,
  `404` on unknown id, `403` on missing permissions. Follows the standard
  OVEN convention documented in `module-rules.md`.
