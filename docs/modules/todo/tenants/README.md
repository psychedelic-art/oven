# Module Tenants — TODO

> **Module**: `tenants`
> **Package**: `packages/module-tenants/`
> **Spec**: [`../../13-tenants.md`](../../13-tenants.md)
> **Canonical docs**: [`../../tenants/`](../../tenants/)
> **Current sprint**: [`sprint-02-unit-tests.md`](./sprint-02-unit-tests.md)
> **Status**: [`STATUS.md`](./STATUS.md)

## Why this is in the queue

`module-tenants` has a Phase-0 implementation on `dev` today:

- Slim `tenants` + `tenant_members` tables
- Seven API handlers (list/CRUD/by-slug/public/members/business-hours)
- Idempotent seed with 7 permissions + 1 public endpoint
- `computeBusinessHours` utility
- `tenantsModule` ModuleDefinition with 15 configSchema entries,
  5 typed events, 3 chat action schemas
- Dashboard components: `TenantList`, `TenantCreate`, `TenantEdit`, `TenantShow`

But the graduation gates are **not** met:

1. **No unit tests**. `computeBusinessHours` is a pure function with
   zero coverage. Seed idempotency is unverified. Handlers have no
   integration tests.
2. **No canonical 11-file doc folder** — just landed in cycle-2
   (this branch).
3. **No sprint plan** — this folder is the fix.
4. **Security gaps** — public endpoint leaks `id` (R3.5), RLS policies
   are planned but not applied, last-owner guard missing on member
   write paths, sort-field allowlist not applied.

Tenants is a Phase-0 foundation — `module-auth`, `module-config`,
`module-subscriptions`, and every tenant-scoped downstream module
depends on it. Shipping the test surface and closing the security
gaps is high leverage.

## Scope boundaries

**In scope**

- Unit tests: `computeBusinessHours`, seed idempotency, type
  validators
- Handler integration tests once a `NextRequest` harness is wired
- Public endpoint: remove `id` leak, enforce `enabled = true` filter
  (already present — write a regression test)
- Member write paths: last-owner guard, `MAX_MEMBERS_PER_TENANT`
  enforcement
- Sort-field allowlist using the F-05-01 pattern
- Dashboard unit tests for `TenantEdit` config tab (config write pattern)

**Out of scope**

- RLS policies (blocked on `module-auth` middleware — cross-module
  sprint)
- Tenant suspension / tenant cloning (product decisions)
- Migration of legacy `tenants` columns (already done on `dev`;
  rollback not planned)
- New UI surface — list/create/edit/show already exist and are
  owned by the `dashboard-ux-system` program

## Sprint roadmap

| Sprint | File | State | Goal |
|---|---|---|---|
| 00 | [`sprint-00-discovery.md`](./sprint-00-discovery.md) | ready | Inventory current implementation; gap analysis; test framework decision |
| 01 | [`sprint-01-foundation.md`](./sprint-01-foundation.md) | ready | Wire vitest; add `__tests__/` folder; first green run |
| 02 | [`sprint-02-unit-tests.md`](./sprint-02-unit-tests.md) | **in progress** | `computeBusinessHours` full coverage (R9.1); seed idempotency; type validators |
| 03 | [`sprint-03-security-hardening.md`](./sprint-03-security-hardening.md) | ready | Remove `id` leak; last-owner guard; MAX_MEMBERS check; sort allowlist |
| 04 | [`sprint-04-acceptance.md`](./sprint-04-acceptance.md) | ready | End-to-end gate + cross-module integration test |

## Dependencies

- `module-registry` — for `ModuleDefinition`, `eventBus`, `api-utils`
- `module-config` — consumed via HTTP for tenant config resolution
- `module-auth` (not yet shipped) — future dependency for RLS policies

## Rule compliance posture

This module targets full compliance with:

- `docs/module-rules.md` — Rule 3.1 no cross-module imports; Rule 4.3
  plain-integer FKs; Rule 6 CRUD + tenant filtering; Rule 13 config
  centralization
- Root `CLAUDE.md` — MUI `sx` in dashboard; `import type` everywhere;
  zustand factory + context (when tenant primitive ships); no inline
  styles; error handling only at boundaries

## Quick links

- Canonical docs: [`../../tenants/`](../../tenants/)
- Top-level spec: [`../../13-tenants.md`](../../13-tenants.md)
- Status: [`STATUS.md`](./STATUS.md)
- Senior code review: [`CODE-REVIEW.md`](./CODE-REVIEW.md)
- Current sprint: [`sprint-02-unit-tests.md`](./sprint-02-unit-tests.md)
