# Subscriptions — Senior Code Review

> Scope: `packages/module-subscriptions/src/**/*` at
> `origin/dev` commit `6aa3dc8`.
> Spec source of truth: `docs/modules/21-module-subscriptions.md`.

## Summary

The package has a full 9-table Drizzle schema, 23 API handlers, an
idempotent seed, and a usage-metering engine. It has **zero unit
tests**. The module is already wired into `apps/dashboard/src/lib/modules.ts`
(registered on `dev`). The most critical drift is lack of automated
coverage for the limit-resolution algorithm described in
`docs/modules/21-module-subscriptions.md` §5.

## Rule compliance audit

| Ground-truth file | Verdict | Notes |
|---|---|---|
| `docs/module-rules.md` Rule 1 (`ModuleDefinition`) | PASS | `src/index.ts` exports a `ModuleDefinition` with all required fields and registers via `registry.register()`. |
| `docs/module-rules.md` Rule 2 (Discoverable — `description`, `capabilities`, `chat.actionSchemas`) | PARTIAL | `description` is present; `capabilities` lists billing concepts; `chat.actionSchemas` exposes `getEffectiveLimits` and `checkQuota`. Needs verification against the Rule 2.3 `events.schemas` format — filed as DRIFT-1. |
| `docs/module-rules.md` Rule 3 (package boundary — no cross-module imports) | PASS | All foreign-key lookups into `module-tenants` go through `@oven/module-registry/db` not through direct package imports. |
| `docs/module-rules.md` Rule 4 (schema — plain integer FKs, `tenantId` as `integer('tenant_id')` every row) | PASS | `sub_tenant_subscriptions.tenantId`, `sub_quota_overrides` indirectly via subscription. No cross-module FK types. |
| `docs/module-rules.md` Rule 5 (seed idempotency) | PASS | Refactored cycle-1 to `INSERT … ON CONFLICT DO UPDATE`. |
| `docs/package-composition.md` | PASS | Package sits at the module layer, depends only on permitted lower layers. |
| `docs/routes.md` | PARTIAL | 20+ routes in the handler folder align with §4 of the top-level spec. `POST /api/usage/track`, `GET /api/usage/summary`, and `GET /api/tenant-subscriptions/[tenantId]/usage` exist in code but are NOT listed in `docs/routes.md` — filed as DRIFT-2. |
| `docs/use-cases.md` | PASS | UC-04 (tenant-admin views usage) and UC-07 (platform-admin configures plans) are satisfied by existing handlers. |
| `docs/modules/00-overview.md` | PASS | Subscriptions is listed as a foundational module that agent-core, ai, notifications, and knowledge-base all depend on at runtime. |
| `docs/modules/13-tenants.md` | PASS | Tenant scoping is enforced via `tenant_id` on every subscription row. |
| `docs/modules/17-auth.md` | N/A | No auth changes — depends on upstream `module-auth` middleware. |
| `docs/modules/20-module-config.md` | PASS | `service-categories` and `services` are config-style resources — consistent with config-module patterns. |
| Root `CLAUDE.md` — no inline styles | N/A | No JSX in this package. |
| Root `CLAUDE.md` — MUI `sx` | N/A | Dashboard UI not in this package. |
| Root `CLAUDE.md` — `import type` | **DRIFT-3** | Spot check shows `src/engine/usage-metering.ts` imports types inline (`import { x, type Y }`) mixed with value imports. Acceptable, but a pass with `import type` grep gate would be cleaner. |
| Root `CLAUDE.md` — error handling only at boundaries | PASS | The engine returns discriminated unions / plain throws that the API handler boundary converts to 4xx/5xx. |
| Canonical 11-file doc shape | **DRIFT-0** | Missing until this cycle-3 session — scaffolded by Phase-3 of this pipeline. |

## Drift register

### DRIFT-0 — Canonical doc set missing (RESOLVED this cycle)

- **Finding**: `docs/modules/subscriptions/` did not exist.
- **Severity**: high (per rules, every graduated module must have the
  11-file shape).
- **Resolution**: scaffolded this cycle. All 11 files populated from
  the top-level spec + the current code + external research.

### DRIFT-1 — `events.schemas` format

- **Finding**: `chat.actionSchemas` is present and rich, but
  `events.schemas` (Rule 2.3 exact shape — `{type, required}` per
  field) has not been explicitly checked against each emitted event
  (`subscription.activated`, `subscription.canceled`,
  `subscription.quota.exceeded`, `usage.tracked`, `usage.threshold.crossed`).
- **Severity**: medium (agent Tool Wrapper needs this to generate
  correct schemas at runtime).
- **Action**: sprint-01 adds a vitest that imports the ModuleDefinition
  and asserts `events.schemas` shape via TypeScript type predicates.

### DRIFT-2 — Usage endpoints not in `docs/routes.md`

- **Finding**: `src/api/usage-track.handler.ts`,
  `src/api/usage-summary.handler.ts`, and `src/api/tenant-usage.handler.ts`
  are three real route files whose paths are not listed in the project
  route registry (`docs/routes.md`).
- **Severity**: medium (spec drift — routes that exist in code are
  invisible to the docs).
- **Action**: sprint-02 updates `docs/routes.md` alongside the usage
  hardening.

### DRIFT-3 — `import type` hygiene in engine

- **Finding**: `src/engine/usage-metering.ts` mixes type and value
  imports in a single line. Per `CLAUDE.md` the preferred form is
  `import { value, type Type }` for mixed usage.
- **Severity**: low.
- **Action**: sprint-01 adds a grep gate to the vitest config.

### DRIFT-4 — Zero unit tests

- **Finding**: `packages/module-subscriptions/` has no `__tests__`
  folder and no `vitest.config.ts`. The limit-resolution algorithm
  (§5 of the top-level spec) and the quota-override precedence rules
  are un-tested despite being called at runtime by `module-ai`
  middleware on every AI request.
- **Severity**: high.
- **Action**: sprint-01 is the entire foundation — scaffold vitest,
  write tests for the five-step limit resolution, add override
  precedence tests, add seed idempotency test.

## Security review

Subscriptions touches billing and is therefore a high-value target.

| OWASP Top 10 | Coverage | Notes |
|---|---|---|
| A01 — Broken Access Control | PASS | All CRUD handlers check `tenant_id` against `req.context.tenantId`; `GET /api/billing-plans/public` is the only public route and returns only `name`, `slug`, `price_cents`, `quotas` (no tenant data). |
| A02 — Cryptographic Failures | PASS (delegated) | Upstream provider credentials live in `module-config` under `platform` scope, encrypted at rest. |
| A03 — Injection | WATCH | Drizzle parameterises queries, but the `GET /api/tenant-subscriptions/[id]/limits/[serviceSlug]` path accepts `serviceSlug` from URL — must assert slug matches `^[a-z0-9-]+$` before the DB query. Not currently validated. Tracked as sprint-02 task S-02-3. |
| A04 — Insecure Design | PASS | Override precedence (override → plan → zero) is explicit and traceable. No "god mode" flag. |
| A05 — Security Misconfiguration | WATCH | Public pricing endpoint must explicitly strip `cost_cents` and `provider_id`; current handler projects only whitelisted columns — document this in `secure.md`. |
| A06 — Vulnerable Components | N/A | Only `drizzle-orm` + `@oven/module-registry` — low dep surface. |
| A07 — Identification & Auth Failures | N/A | Delegated to `module-auth`. |
| A08 — Software & Data Integrity Failures | WATCH | `POST /api/usage/track` is currently fire-and-forget. Idempotency key (`X-Usage-Idempotency-Key`) needed so retries from `module-ai` middleware don't double-count tokens. Tracked as sprint-02. |
| A09 — Security Logging | PARTIAL | No structured audit log for `subscription.activated` / `subscription.canceled`; recommend emitting an `audit.*` event in sprint-02. |
| A10 — SSRF | N/A | No outbound HTTP in this package. |

## Recommendation

**Queue for execution** — the module is production code with a hard
documentation + test gap. The sprint plan published in this cycle is
the minimum to close the gap. Sprint-01 (vitest scaffold + foundation
tests) is the single most valuable task in the current todo queue
because it unblocks sprint-02 hardening and protects the downstream
`module-ai` middleware.
