# Sprint 03 — Usage Metering + Rule 13 Resolution

## Goal

Make usage limits real. Resolve the DRIFT-1 Rule 13 violation by reading per-tenant
message limits from `module-subscriptions` plan quotas with a
`module-config` fallback. Ship monthly period rollover, the
`checkUsageLimit()` service, limit threshold events, and the
`notifications.checkLimit` workflow node for agent pipelines.

## Scope

### In

- `src/services/usage-limit-resolver.ts` — resolves the limit for a
  `(tenantId, channelType)` pair in this order:
  1. `module-subscriptions` `checkQuota({ serviceSlug })` for service slugs
     `notifications-whatsapp`, `notifications-sms`, `notifications-email`.
     Accessed via registry discovery + HTTP strategy — never a direct import
     (Rule 3.1 + Rule 3.2).
  2. If no subscription attached, fall back to the resolve-batch endpoint
     from `module-config` for `DEFAULT_WHATSAPP_LIMIT` / `DEFAULT_SMS_LIMIT`
     / `DEFAULT_EMAIL_LIMIT` (declared in sprint-01 `configSchema`).
  3. If neither is available, return `{ allowed: false, limit: 0, used,
     remaining: 0 }` — fail-safe so no tenant gets unlimited messaging on
     a misconfigured install.
- `src/services/usage-metering.ts` — `checkUsageLimit(tenantId,
  channelType)`, `incrementUsage(tenantId, channelType)`,
  `getMonthStart(date?)`, `getPeriodEnd(monthStart)`. Atomic counter
  increment using `ON CONFLICT (tenant_id, channel_type, period_start)
  DO UPDATE SET message_count = notification_usage.message_count + 1`.
- Warning event emission when current usage crosses the
  `USAGE_WARNING_THRESHOLD` percent (default 80% per configSchema).
  Emit only on the crossing, not repeatedly.
- `src/services/usage-metering.ts` wires `notifications.usage.limitWarning`
  and `notifications.usage.limitExceeded` event emission.
- `src/api/notifications-usage.handler.ts` — GET — returns usage summary
  per channel for a tenant.
- **New workflow node type** registered via the agent-core node registry:
  `notifications.checkLimit`. Node input: `{ tenantId, channelType }`.
  Node output: `{ allowed, used, limit, remaining }`. If
  `!allowed`, the node sets a short-circuit flag that routes the workflow
  to an escalation response (reason: `limit-exceeded`).
- Unit tests:
  - `src/__tests__/usage-limit-resolver.test.ts` — covers all three tiers of
    the resolver + the fail-safe path.
  - `src/__tests__/usage-metering.test.ts` — covers period rollover,
    atomic increment, warning crossing logic (no double-emit), limit
    exceeded emission.
  - `src/__tests__/notifications-usage-handler.test.ts` — GET contract.
- Wire the new usage-metering service into the sprint-02 webhook ingest
  pipeline: after inserting the inbound message, call
  `checkUsageLimit()` and `incrementUsage()`. If the limit is already
  exceeded, short-circuit to an escalation insert instead of calling the
  agent.

### Out

- Dashboard usage gauge (sprint-04)
- Quota upsell flow / Stripe integration (deferred — lives in
  `module-subscriptions`)
- Billing reconciliation (cron) — deferred

## Deliverables

1. `src/services/usage-limit-resolver.ts` + tests
2. `src/services/usage-metering.ts` + tests
3. `src/api/notifications-usage.handler.ts` + test
4. `notifications.checkLimit` workflow node registered
5. Sprint-02 webhook pipeline updated to call usage metering
6. `15-notifications.md` spec section 6 updated to point at
   `module-subscriptions` plan quotas (closes DRIFT-1)
7. Commit: `feat(notifications): usage metering service + checkLimit node`
8. Commit: `test(notifications): usage resolver, metering, handler`
9. Commit: `docs(notifications): resolve rule-13 drift in spec section 6`

## Acceptance Criteria

- [ ] Resolver tests pass all three tiers
- [ ] `incrementUsage` is atomic (asserted by concurrent-call test)
- [ ] Warning event fires exactly once when crossing 80%, not on every
  subsequent message below 100%
- [ ] `notifications.usage.limitExceeded` fires exactly once when crossing
  100%, not on repeated over-limit attempts in the same period
- [ ] DRIFT-1 item in CODE-REVIEW.md marked resolved with commit hash
- [ ] Spec file edit reviewed: no other section still references
  `tenant.whatsappLimit`

## Dependencies

- Sprint-01 (schema + configSchema)
- Sprint-02 (webhook ingest pipeline to hook into)
- `module-subscriptions` `checkQuota()` contract
- `module-config` `resolve-batch` endpoint
- `module-workflow-agents` node registry (for the workflow node)

## Risks

- **Race condition on warning emission** — two concurrent messages could
  both see "just crossed 80%". Mitigation: use the DB row's pre-increment
  value and only emit if `old_count < threshold AND new_count >= threshold`.
- **Cron-less rollover** — we don't want a dedicated cron to open new
  period rows. Mitigation: the upsert creates the row lazily on first
  inbound message of the month.
- **Subscriptions module may not be installed** — platform installs can run
  without `module-subscriptions`. Mitigation: lazy resolution per Rule 3.2
  (`try { require(...) } catch { return null }`).

## Test Plan (TDD)

1. Resolver tests first — three tiers + fail-safe.
2. Metering tests — period rollover, atomic increment, event crossing.
3. Handler test — contract only.
4. Workflow node test — input / output contract.

## Rule Compliance Checklist

- [ ] Rule 3.1 — `module-subscriptions` called via HTTP, never imported
- [ ] Rule 3.2 — lazy adapter resolution when subscriptions missing
- [ ] Rule 5.6 — usage events carry tenantId
- [ ] Rule 13 — DRIFT-1 resolved; spec updated
