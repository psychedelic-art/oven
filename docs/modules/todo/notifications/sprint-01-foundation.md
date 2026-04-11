# Sprint 01 — Foundation

## Goal

Land `packages/module-notifications/` as a compilable, testable, rule-compliant
module package with the `ModuleDefinition` contract, Drizzle schema, adapter
interface, in-memory adapter registry, seed function, and vitest unit tests.
No dashboard UI, no real adapter, no live webhook endpoint yet — those come in
sprints 02 and 04.

## Scope

### In

- `packages/module-notifications/package.json` — matches the `module-ai` /
  `module-tenants` convention. Declares workspace dependencies on
  `module-registry`, `module-roles`, `module-config`, `module-subscriptions`,
  and `drizzle-orm`. Adds `vitest` as a dev dependency and a `test` script.
- `packages/module-notifications/tsconfig.json` — mirror `module-tenants`.
- `src/schema.ts` — Drizzle definitions for all 5 tables from spec section 4:
  - `notificationChannels`
  - `notificationConversations`
  - `notificationMessages`
  - `notificationUsage`
  - `notificationEscalations`
  - Export `notificationsSchema` object for registry composition.
- `src/types.ts` — `ChannelType`, `MessageContent`, `SendResult`,
  `InboundMessage`, `DeliveryStatus`, `EscalationReason`, plus the
  `NotificationAdapter` interface. All type exports use `export type`.
- `src/adapters/types.ts` — re-exports the adapter interface for external
  packages (`@oven/notifications-meta`, `@oven/notifications-twilio`,
  `@oven/notifications-resend`) to import via
  `@oven/module-notifications/adapters`.
- `src/adapters/registry.ts` — in-memory adapter registry with
  `registerNotificationAdapter(adapter)`, `getAdapter(name)`,
  `getAdapterForChannelType(type)`, `listAdapters()`, `clearAdapters()`
  (tests only). The registry **never imports** a specific adapter package —
  wiring happens at app startup via `apps/dashboard/src/lib/modules.ts`.
- `src/seed.ts` — idempotent `seedNotifications()` that inserts module
  permissions and marks `notifications/whatsapp/webhook` GET + POST as public
  in `api_endpoint_permissions`. Matches the shape of
  `packages/module-tenants/src/seed.ts`.
- `src/index.ts` — exports `notificationsModule: ModuleDefinition` with:
  - `name: 'notifications'`
  - `dependencies: ['config', 'tenants', 'agent-core']` (note: no direct dep
    on `subscriptions` — it's resolved via registry discovery at runtime per
    Rule 3.2 lazy pattern, because subscriptions is optional for platform
    installs that don't meter notifications)
  - `schema`, `seed`, empty `apiHandlers: {}` (handlers ship in sprint-02),
    empty `resources: []` (UI ships in sprint-04)
  - `configSchema` — the 4 entries from spec section 11 **plus** the new
    `DEFAULT_WHATSAPP_LIMIT`, `DEFAULT_SMS_LIMIT`, `DEFAULT_EMAIL_LIMIT`
    fallback entries from the Rule 13 resolution
  - `events.emits` — all 8 events from spec section 9
  - `events.schemas` — all 8 typed schemas (completes DRIFT-2 from CODE-REVIEW)
  - `chat` block — verbatim from spec section 11 + `notifications.checkLimit`
- `src/__tests__/schema.test.ts` — asserts every table has `tenantId`
  (for the 4 tenant-scoped tables) and `id`, `createdAt`, `updatedAt`
  on all tables; asserts `notificationUsage` has the composite unique index.
- `src/__tests__/adapter-registry.test.ts` — exercises register / get /
  list / clear; asserts `getAdapter('unknown')` returns `null`; asserts that
  registering two adapters with the same `name` throws.
- `src/__tests__/module-definition.test.ts` — asserts:
  - `notificationsModule.name === 'notifications'`
  - Every event listed in `emits` has a matching entry in `schemas`
  - Every `configSchema` entry has `key`, `type`, `description`, `defaultValue`
  - `chat.actionSchemas` is non-empty and every action has `endpoint.method` + `endpoint.path`
  - `dependencies` is exactly `['config', 'tenants', 'agent-core']`
- `src/__tests__/seed.test.ts` — calls `seedNotifications` with a
  fake `db` object and asserts the expected permission + public endpoint
  insertions happen. Verifies idempotency (second call is a no-op).
- Update
  [`docs/modules/todo/notifications/STATUS.md`](./STATUS.md) with commit
  references.

### Out

- API handlers for channels, conversations, escalations (sprint-02)
- Meta / Twilio / Resend adapter implementations (sprint-02 for Meta)
- Dashboard UI (sprint-04)
- Usage metering resolver wiring to `module-subscriptions` (sprint-03)
- Registering the module in `apps/dashboard/src/lib/modules.ts` (sprint-05)

## Deliverables

1. `packages/module-notifications/` scaffold as above
2. All tests passing under `cd packages/module-notifications && pnpm test`
3. No changes to any other package (this is a pure new-package sprint)
4. Commit: `feat(notifications): sprint-01 foundation — scaffold module package`
5. Commit: `test(notifications): cover schema, adapter registry, module definition, seed`
6. Commit: `docs(notifications): record sprint-01 completion`

## Acceptance Criteria

- [ ] `pnpm --filter @oven/module-notifications test` exits 0 with all four
  test files green.
- [ ] `grep -r 'style={' packages/module-notifications` returns nothing.
  (Not applicable to this sprint — no JSX.)
- [ ] `grep -rn "from '@oven/notifications-" packages/module-notifications/src`
  returns nothing — the module never imports an adapter package.
- [ ] `grep -rn 'references(' packages/module-notifications/src/schema.ts`
  returns nothing — plain integer FKs only (Rule 4.3).
- [ ] `grep -rn 'import {' packages/module-notifications/src/types.ts` shows
  only `import type` forms for any cross-file type pulls (root `CLAUDE.md`).
- [ ] Every tenant-scoped table has an index on `tenant_id` (Rule 5.1).
- [ ] `notificationsModule.events.schemas` has an entry for each name in
  `notificationsModule.events.emits` — asserted by the test.
- [ ] `notificationsModule.chat.actionSchemas` contains at least
  `notifications.listConversations`, `notifications.getUsage`,
  `notifications.listEscalations`, `notifications.checkLimit`.
- [ ] STATUS.md updated with commit hashes and the sprint state moved to
  `done`.

## Dependencies

Code-level (workspace packages):
- `@oven/module-registry` — `ModuleDefinition`, `EventSchemaMap` types
- `drizzle-orm/pg-core` — table definitions
- `vitest` — test framework

Doc-level:
- [`../../notifications/architecture.md`](../../notifications/architecture.md)
- [`../../notifications/database.md`](../../notifications/database.md)
- [`../../notifications/module-design.md`](../../notifications/module-design.md)
- [`./CODE-REVIEW.md`](./CODE-REVIEW.md)

## Risks

- **Registry types may drift** — if `@oven/module-registry` recently changed
  its `ModuleDefinition` type, tests could fail to compile. Mitigation: read
  the current `packages/module-registry/src/types.ts` before authoring
  `src/index.ts`. Fallback: narrow the return type until the test file
  compiles cleanly.
- **Adapter interface drift** — if a later adapter package needs a field the
  interface doesn't expose, we add it in that sprint, not here.
  Do not over-engineer for hypothetical adapter needs.

## Test Plan (TDD)

Order of operations:

1. Write `src/__tests__/schema.test.ts` first asserting table column names.
   It will fail because `src/schema.ts` doesn't exist.
2. Implement `src/schema.ts` minimally to make it pass.
3. Write `src/__tests__/adapter-registry.test.ts` first asserting the
   registry API. It will fail.
4. Implement `src/adapters/types.ts` + `src/adapters/registry.ts`.
5. Write `src/__tests__/module-definition.test.ts` first asserting the
   `notificationsModule` invariants. Then implement `src/index.ts`.
6. Write `src/__tests__/seed.test.ts` first with a fake db; then implement
   `src/seed.ts`.
7. Run `pnpm test` — all four files must be green before committing.

## Rule Compliance Checklist

- [ ] Rule 1.1 — `notificationsModule` satisfies `ModuleDefinition`
- [ ] Rule 1.3 — package lives at `packages/module-notifications/`
- [ ] Rule 1.4 — package structure matches `packages/module-{name}/src/*`
- [ ] Rule 2.1 — `chat` block declared with `description`, `capabilities`,
  `actionSchemas`
- [ ] Rule 2.3 — event schemas complete (closes DRIFT-2)
- [ ] Rule 3.1 — no cross-module business-logic imports
- [ ] Rule 3.3 — adapter interface + external packages pattern
- [ ] Rule 4.3 — plain integer FKs
- [ ] Rule 5.1 — tenantId columns + indexes
- [ ] Rule 5.6 — events carry tenantId
- [ ] Rule 8 — configSchema declared with type + description + default
- [ ] Rule 10.5 — webhook routes marked public via seed
- [ ] Rule 11.1 — table names use `notification_` prefix, snake_case
- [ ] Rule 11.2 — all tables have `id`, `createdAt`, `updatedAt`
- [ ] Rule 11.3 — indexes on `tenantId`, `channelType`, `externalUserId`, `status`
- [ ] Rule 12.1 — seed is idempotent
- [ ] Rule 12.3 — permissions seeded
- [ ] Rule 13.2 — all tenant-customizable settings live in `configSchema`
- [ ] Root `CLAUDE.md` `import type` — all type-only imports use
  `import type` or inline `type` modifier
