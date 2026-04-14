# Notifications — Code Review & Rule Compliance

> Review date: 2026-04-11
> Reviewer: `claude/eager-curie-4GaQC` session (senior engineering pass)
> Subject: `docs/modules/15-notifications.md` (spec) + adjacent modules that
> notifications will integrate with (`module-tenants`, `module-subscriptions`,
> `module-agent-core`, `module-config`).

---

## Scope

There is no `packages/module-notifications/` yet. The review covers:

1. The spec itself (`15-notifications.md`).
2. Integration surface with existing packages the module will call.
3. Rule compliance against ground-truth docs.
4. Existing GitHub issues / PRs that touch notification flows.

---

## Rule Compliance Matrix

| Ground truth | Spec status | Action |
|---|---|---|
| `docs/module-rules.md` Rule 1 (`ModuleDefinition`) | **PASS** — spec section 11 exports `notificationsModule` satisfying the contract. | Implement in `src/index.ts`. |
| Rule 2.1 (`chat` block) | **PASS** — spec section 11 includes `chat.description`, `capabilities`, 3 `actionSchemas`. | Port verbatim with `notifications.checkLimit` added. |
| Rule 2.3 (event schemas) | **PASS** — spec section 11 declares `events.schemas` for 5 of the 8 emitted events. | Fill in the missing 3 (`message.delivered`, `message.failed`, `usage.limitWarning`) during sprint-01. |
| Rule 3.1 (no cross-module imports) | **PASS** — spec calls `module-agent-core` via internal service; we will use the in-process registry lookup + HTTP strategy, never a direct import. | Test: `test(notifications): no package imports` assertion. |
| Rule 3.3 (adapter pattern) | **PASS** — spec section 3 defines `NotificationAdapter` exactly matching the example in `module-rules.md` Rule 3.3. | Ship interface in sprint-01 (in-module) and a real Meta adapter in sprint-02 as `@oven/notifications-meta`. |
| Rule 4.3 (plain integer FKs) | **PASS** — spec section 4 uses `integer('tenant_id')`, `integer('channel_id')`, etc. No `references()`. | Mirror verbatim. |
| Rule 5.1 (tenantId column + index) | **PASS** — every tenant-scoped table has `tenantId` + `nc_tenant_id_idx` / `nconv_tenant_id_idx` / `nesc_tenant_id_idx` / `nu_tenant_id_idx`. | No change. |
| Rule 5.2 (API handlers filter by tenant) | **PASS** — spec section 13 example filters by `tenantId`. | Mirror in every handler. |
| Rule 5.6 (events include tenantId) | **PASS** — spec section 9 shows `tenantId` in each event payload. | Mirror in `events.schemas`. |
| Rule 8 (config cascade) | **PASS** — spec section 11 declares 4 `configSchema` entries (`WHATSAPP_API_VERSION`, `USAGE_WARNING_THRESHOLD`, `AUTO_CLOSE_CONVERSATION_HOURS`, `ESCALATION_NOTIFY_OFFICE`). | Add `DEFAULT_WHATSAPP_LIMIT` / `DEFAULT_SMS_LIMIT` / `DEFAULT_EMAIL_LIMIT` as fallback knobs after the Rule 13 fix. |
| Rule 10 (shared API utilities) | **PASS** — spec section 13 uses `parseListParams` + `listResponse`. | Mirror in every handler. |
| Rule 10.5 (public endpoints marked) | **PASS** — spec section 12 seed inserts `is_public` for webhook GET + POST. | Mirror verbatim. |
| Rule 11.1 (table naming) | **PASS** — `notification_channels`, `notification_messages`, etc. | No change. |
| Rule 11.2 (standard columns) | **PASS** — every table has `id`, `createdAt`, `updatedAt`. | No change. |
| **Rule 13 (config centralization / no behavioral columns)** | **FAIL — drift found** | **See section "Drift findings" below.** |
| `docs/routes.md` | **PASS** — routes use `/api/notification-channels`, `/api/notification-conversations`, etc. (React Admin resource convention). | Cross-check during sprint-02 when handlers land. |
| `docs/modules/13-tenants.md` | **PASS** — the spec delegates tenant resolution to `module-tenants` and does not write tenant columns. | No change. |
| `docs/modules/17-auth.md` | **PASS** — spec uses auth middleware for all non-webhook routes; webhook routes marked public. | No change. |
| `docs/modules/20-module-config.md` | **PASS** — `configSchema` entries are resolved via the cascade endpoint. | Add usage warning threshold consumer in sprint-03. |
| `docs/modules/21-module-subscriptions.md` | **PARTIAL** — spec section 6 reads limits from `module-tenants` columns instead of `module-subscriptions` plan quotas. | Fix in architecture.md + sprint-03; update spec file in sprint-05. |
| Root `CLAUDE.md` styling rules (MUI `sx`, no `style={}`) | **PASS** — spec section 8 lists React Admin components; no inline styles. | Enforce in sprint-04 UI implementation. |
| Root `CLAUDE.md` `import type` rule | n/a — no code yet. | Enforce during sprint-01 scaffold. |
| Root `CLAUDE.md` zustand factory rule | n/a — no client stores planned. | Revisit if sprint-04 adds a conversation viewer store. |

---

## Drift findings

### DRIFT-1 — Usage limits referenced as tenant columns (Rule 13 violation)

- **Location**: `docs/modules/15-notifications.md` section 6 ("Usage Tracking"):
  > Limit comes from `module-tenants`: `tenant.whatsappLimit` (default 300)
  > and `tenant.webLimit` (default 500)
- **Reality**: `packages/module-tenants/src/schema.ts` is a slim identity
  table. It has `id`, `name`, `slug`, `enabled`, `metadata`, `createdAt`,
  `updatedAt` — no `whatsappLimit`, no `webLimit`. Rule 13 explicitly
  prohibits those columns on identity tables, listing `whatsappLimit` as a
  **Wrong** example.
- **Resolved design** (see [`../../notifications/architecture.md`](../../notifications/architecture.md#usage-limit-resolution)):
  1. Primary: `module-subscriptions` plan quotas keyed by service slugs
     `notifications-whatsapp`, `notifications-sms`, `notifications-email`.
     Notifications calls `checkQuota()` from the subscriptions engine (via
     HTTP strategy, not direct import) during inbound processing.
  2. Secondary: if no subscription is attached, fall back to a
     `configSchema` default (`DEFAULT_WHATSAPP_LIMIT`, resolved via
     `module-config`).
  3. Tertiary: hard-coded 0 → immediate escalation (fail-safe).
- **Status**: RESOLVED (sprint-03, cycle-24)
- **Resolved by**: `usage-limit-resolver.ts` implements the three-tier
  cascade; spec file `15-notifications.md` section 6 updated to reference
  `module-subscriptions` plan quotas and `module-config` fallbacks.
  12 resolver tests pass all three tiers + fail-safe.
- **Commits**: feat(notifications): usage metering service, test(notifications): usage resolver/metering/handler, docs(notifications): resolve rule-13 drift in spec section 6

### DRIFT-2 — `notificationMessages.status` missing `delivered` event schema

- `events.emits` lists `notifications.message.delivered` and
  `notifications.message.failed` but `events.schemas` does not define
  schemas for them or for `notifications.usage.limitWarning`.
- **Action**: Add these 3 schemas in sprint-01 `src/index.ts`.

### DRIFT-3 — Spec section 8 uses non-MUI terminology

- Spec mentions "WhatsApp-style chat bubbles: inbound left, outbound right".
  This is fine at the design level but when implementing we must use MUI
  `sx` only — no inline styles, no raw CSS classes.
- **Action**: Sprint-04 implementation uses `<Box sx={{ ... }}>` with the
  theme's `action.hover` / `primary.main` tokens. Verified in the sprint-04
  acceptance criteria.

---

## Existing GitHub issues / PRs

A GitHub search for `notifications`, `whatsapp`, `twilio`, `meta webhook`
in `psychedelic-art/oven` returned **no open issues or pull requests**
touching this module as of 2026-04-11. The module is genuinely greenfield.

(Search tool calls: `mcp__github__search_issues` with the repo scoped
to `psychedelic-art/oven`.)

---

## Recommendation

**Proceed with sprint-00 as done** (this review + the canonical doc set
scaffold count as the discovery deliverable) and **enter sprint-01 in Phase 4
of this same session**. The spec is sound; only Rule 13 and two schema gaps
need to be patched, all captured above and routed to specific sprints.
