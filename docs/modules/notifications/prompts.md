# Prompts — module-notifications

> This file collects the build prompts each sprint hands to an agent
> (human or Claude) when executing. Each prompt is self-contained and
> links to the sprint doc, the code it should produce, and the tests
> that must go red first.

---

## Sprint 01 — Foundation

```
You are working on @oven/module-notifications sprint 01 (foundation).

READ FIRST
- docs/modules/todo/notifications/sprint-01-foundation.md
- docs/modules/notifications/architecture.md
- docs/modules/notifications/database.md
- docs/modules/notifications/module-design.md
- docs/modules/15-notifications.md (the spec)
- docs/module-rules.md rules 1, 2, 3, 4.3, 5, 8, 10, 11, 12, 13
- packages/module-tenants/ as a reference implementation
- packages/module-ai/src/__tests__/cost-calculator.test.ts for the vitest test shape

CREATE
- packages/module-notifications/package.json
- packages/module-notifications/tsconfig.json
- src/schema.ts            (5 Drizzle tables, plain-int FKs, all indexes from database.md)
- src/types.ts             (NotificationAdapter interface, ChannelType, MessageContent, SendResult, InboundMessage, DeliveryStatus, EscalationReason)
- src/events.ts            (event name constants + EventSchemaMap literal)
- src/adapters/types.ts    (re-export NotificationAdapter for adapter packages)
- src/adapters/registry.ts (in-memory Map, register/get/listAdapters/clearAdapters)
- src/seed.ts              (permissions + public endpoints via onConflictDoNothing)
- src/index.ts             (notificationsModule ModuleDefinition)

TESTS (write first, red, then implement)
- src/__tests__/schema.test.ts
- src/__tests__/adapter-registry.test.ts
- src/__tests__/module-definition.test.ts
- src/__tests__/seed.test.ts
- src/__tests__/no-cross-module-imports.test.ts

RULES (hard)
- import type for type-only imports
- No drizzle-orm references() — plain integer FKs
- No inline style={} (no JSX in this sprint anyway)
- events.emits and events.schemas must cover the same 8 event names
- seed function must be idempotent (second call inserts nothing new)
- dependencies array is exactly ['config', 'tenants', 'agent-core']
- Do not create apps/dashboard/src/lib/modules.ts registration yet — that's sprint-05
- Do not touch any other package

ACCEPTANCE
- pnpm --filter @oven/module-notifications test exits 0
- docs/modules/todo/notifications/STATUS.md updated with commit hashes
- Conventional commits: feat(notifications): sprint-01 foundation …, test(notifications): …, docs(notifications): …
- Push with git push -u origin claude/eager-curie-4GaQC
- Do NOT open a PR unless the user explicitly asks
```

---

## Sprint 02 — WhatsApp Meta Adapter

See `docs/modules/todo/notifications/sprint-02-whatsapp-meta-adapter.md` for the
deliverables list. The prompt to hand the agent is the same shape as
sprint-01 with the following hot-path reminders:

- Webhook POST handler MUST call `await request.text()` BEFORE any JSON
  parsing. The test file reads the handler source to assert this.
- Use `crypto.timingSafeEqual` on equal-length buffers; reject the
  header if it does not start with `sha256=`.
- Adapter lives in a **separate** package (`packages/notifications-meta`);
  the module never imports it — only the dashboard wiring does.
- Dashboard wiring in `apps/dashboard/src/lib/modules.ts` imports
  `metaAdapter` and calls `registerNotificationAdapter(metaAdapter)`
  BEFORE `registry.register(notificationsModule)`.

---

## Sprint 03 — Usage Metering + Rule 13 Resolution

Hot-path reminders:

- `module-subscriptions` is soft-required. Use the lazy pattern from
  Rule 3.2 (`try { require('@oven/module-subscriptions/engine') } catch { return null }`).
- Warning event emits **exactly once** per period per crossing. Assert
  this in a test with two successive `incrementUsage` calls that
  straddle the threshold.
- Update `docs/modules/15-notifications.md` section 6 in the same
  commit that ships the resolver — closes DRIFT-1.

---

## Sprint 04 — Dashboard UI

Hot-path reminders:

- MUI `sx` only. No `style={}`. No `className` with hand-written
  classes. No `styled()`. The test file for this sprint includes a
  grep assertion against the new directory.
- List views auto-filter by `useTenantContext().activeTenantId`.
- Create forms auto-assign `tenantId` via the `transform` prop.
- Verify the repo's chart library availability BEFORE importing one;
  if none is present, fall back to the gauge + table layout and record
  the deferral in STATUS.md.

---

## Sprint 05 — Acceptance

Hot-path reminders:

- Run the full dental FAQ WhatsApp flow end-to-end. If the required
  upstream modules (`module-knowledge-base`, `module-agent-core`) are
  not yet implemented, record "contract-only e2e" in STATUS.md and
  do not fake the result.
- Ask the user via AskUserQuestion before moving
  `docs/modules/todo/notifications/` to any graduated location — that
  is the sole authorized pause point in Phase 4.
