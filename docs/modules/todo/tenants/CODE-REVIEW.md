# Module Tenants — Code Review

> Review date: 2026-04-11
> Reviewer: `claude/inspiring-clarke-GA0Ok` cycle-2 session (senior pass)
> Subject: `packages/module-tenants/` as implemented on `dev`
> (bafe894 + cycle-2 merges)

## Scope

Senior code review of the existing `packages/module-tenants/` package
against every ground-truth rules file, plus the root `CLAUDE.md`
styling rules for the dashboard components in
`apps/dashboard/src/components/tenants/`.

## Rule Compliance Matrix

| Ground truth | Status | Notes |
|---|---|---|
| `docs/module-rules.md` Rule 1 (ModuleDefinition) | PASS | `tenantsModule` declared in `src/index.ts:38` with name, deps, schema, seed, resources, apiHandlers, configSchema, events, chat. |
| Rule 2 (registration order) | PASS | `dependencies: ['config']` — the registry throws if `module-config` is missing. Dashboard `modules.ts` registers in order. |
| Rule 3.1 (no cross-module imports) | PASS | No `@oven/module-*` import besides `@oven/module-registry`. `module-config` is consumed via HTTP from the handlers, not via workspace dep. |
| Rule 3.3 (adapter pattern where applicable) | N/A | No adapter surface in this module. |
| Rule 4.1 (event naming) | PASS | All five events follow `tenants.<entity>.<action>`. |
| Rule 4.3 (plain-integer FKs) | PASS | `tenantMembers.tenantId`/`userId` are plain `integer()`, no `references()`. |
| Rule 6.1 (CRUD convention) | PASS | Four resource components exist in `apps/dashboard/src/components/tenants/`. |
| Rule 6.3 (list views tenant filtering) | **GAP** | `TenantList` shows all rows regardless of active tenant. Routed to `dashboard-ux-system` sprint-03 (`useTenantContext`). |
| Rule 6.4 (create forms auto-assign tenant) | **GAP** | Same primitive gap. |
| Rule 13 (config centralization) | PASS | Zero operational-config columns on `tenants`. 15 entries in `configSchema`. |
| `docs/package-composition.md` | PASS | Tenants is a Phase-0 foundation module. Dashboard UI lives in `apps/dashboard/`, not in the package. No peer deps on UI libs. |
| `docs/routes.md` | PASS | All routes under `/api/tenants/*` and `/api/tenant-members/*` are registered. |
| `docs/use-cases.md` | PASS for UC-2, UC-3, UC-9, UC-11. See [`use-case-compliance.md`](../../tenants/use-case-compliance.md). |
| `docs/modules/00-overview.md` | PASS | Tenants is Phase-0 and correctly positioned. |
| `docs/modules/13-tenants.md` | PASS | Package matches spec (identity fields only; handlers present; events emitted; chat block populated). |
| `docs/modules/17-auth.md` | N/A yet — tenants has no auth coupling today; future RLS integration. |
| `docs/modules/20-module-config.md` | PASS | All 14 migrated columns declared as `instanceScoped` config entries. |
| `docs/modules/21-module-subscriptions.md` | PASS | `whatsappLimit` / `webLimit` fully removed; subscriptions owns quota. |
| Root `CLAUDE.md` — no inline styles | PASS (package); NEEDS VERIFICATION (dashboard components) | Package has no JSX. Dashboard components need grep audit — routed as sprint-01 task. |
| Root `CLAUDE.md` — MUI `sx` | PASS (audited on the four dashboard components). |
| Root `CLAUDE.md` — `import type` | PASS — `src/index.ts` opens with `import type { ModuleDefinition, EventSchemaMap }`. |
| Root `CLAUDE.md` — error handling only at boundaries | PASS — `computeBusinessHours` returns `false` on bad input without throwing; handlers are the boundary. |
| Canonical 11-file doc shape | PASS — scaffolded cycle-2 (this branch). |

## Drift / gap findings

### DRIFT-1 — `computeBusinessHours` has no unit tests

- **Location**: `packages/module-tenants/src/utils.ts:1-35`
- **Symptom**: Zero test files in `packages/module-tenants/`.
- **Impact**: A bug in the timezone/weekday extraction would silently
  break the business-hours pill on the TenantShow view, the
  out-of-hours chat gating in `module-chat`, and the
  `tenants.checkBusinessHours` chat action schema. No guardrail.
- **Resolution**: sprint-02 adds `__tests__/compute-business-hours.test.ts`
  with full R9.1 coverage. **Shipped in this cycle.**

### DRIFT-2 — Public endpoint leaks numeric `id`

- **Location**: `packages/module-tenants/src/api/tenants-public.handler.ts`
- **Symptom**: The response assembler copies `tenant.id` into the
  public JSON. R3.5 says public endpoints must not leak numeric ids.
- **Impact**: Low-severity info leak — id probing is possible anyway
  via the `/api/tenants` authenticated endpoint, but the public
  surface should not be a second source.
- **Resolution**: sprint-03 removes the field and adds a regression test.

### DRIFT-3 — Last-owner guard missing

- **Location**: `tenant-members-by-id.handler.ts` DELETE; same handler
  PUT if role change is implemented.
- **Symptom**: A tenant can end up with zero owners via direct API
  call.
- **Impact**: Tenant becomes unmanageable — no member can edit its
  own role to owner, meaning an admin-level user has to intervene.
- **Resolution**: sprint-03 adds the guard with a `409 Conflict` error.

### DRIFT-4 — `MAX_MEMBERS_PER_TENANT` not enforced

- **Location**: `tenant-members.handler.ts` POST
- **Symptom**: The config key exists and defaults to `50`, but the
  POST handler does not read it before inserting.
- **Impact**: A tenant on the free tier can add unlimited members.
  Billing/quota drift.
- **Resolution**: sprint-03 adds the count-then-check.

### DRIFT-5 — Sort-field allowlist missing on list handlers

- **Location**: `tenants.handler.ts` GET, `tenant-members.handler.ts` GET
- **Symptom**: `(table as any)[params.sort] ?? table.id` pattern, same
  as the one F-05-01 fixed in `module-ai`.
- **Impact**: Prototype-key bypass (`constructor`, `toString`) produces
  opaque runtime errors. Minor OWASP A03 concern.
- **Resolution**: sprint-03 copies the F-05-01 helper pattern. Once the
  helper moves to `module-registry/api-utils`, tenants imports from
  there instead of duplicating the code.

### DRIFT-6 — Seed idempotency unverified by test

- **Location**: `packages/module-tenants/src/seed.ts`
- **Symptom**: Uses `onConflictDoNothing()` so it IS idempotent, but
  no test asserts this.
- **Impact**: A future refactor could silently break idempotency.
- **Resolution**: sprint-02 adds a test that runs the seed twice and
  asserts row counts.

## Research shortlist (external)

Already captured in [`references.md`](../../tenants/references.md).
Summary:

1. PostgreSQL RLS docs — for sprint-03+ RLS rollout plan.
2. Drizzle RLS support — tenants is a candidate for the first
   RLS-enabled table in the monorepo.
3. Supabase multi-tenant patterns — validates the slim-identity
   + RLS approach.
4. Stripe Customer object — direct analog for the slim-identity
   pattern.
5. `Intl.DateTimeFormat` MDN — the reference for
   `computeBusinessHours` correctness.
6. Martin Fowler "Event-carried state transfer" — the pattern used
   by tenants event emission.

## Recommendation

**ACCEPT** the existing package as the baseline. Close the gaps via
the sprint plan in `docs/modules/todo/tenants/`. No refactor is
needed — the shape is correct, the handlers are in place, the
module contract is satisfied. The work is test coverage + security
hardening, not rewrite.

## Sign-off prerequisites for graduation

- sprint-02 unit tests green (shipping this cycle)
- sprint-03 security gaps closed
- sprint-04 cross-module acceptance test passing
- Documentation cross-linked in `IMPLEMENTATION-STATUS.md`
