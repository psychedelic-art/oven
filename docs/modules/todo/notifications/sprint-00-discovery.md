# Sprint 00 — Discovery

## Goal

Produce enough research, crosscheck, and rule-compliance output to confidently
enter sprint-01 with zero ambiguity. No code is shipped in this sprint.

## Scope

- Inventory every file under `docs/modules/notifications/` (canonical doc set)
- Inventory every file under `docs/modules/todo/notifications/` (sprint
  tracking set)
- Cross-check `docs/modules/15-notifications.md` against
  `docs/module-rules.md`, `docs/modules/13-tenants.md`,
  `docs/modules/20-module-config.md`, `docs/modules/21-module-subscriptions.md`
- External research: Meta WhatsApp Business Cloud API webhook security,
  Next.js 15 App Router raw-body patterns, adapter interface patterns across
  notification providers

## Out of scope

- Writing any TypeScript
- Touching any package under `packages/`
- Opening PRs, creating backup branches

## Deliverables

1. [`CODE-REVIEW.md`](./CODE-REVIEW.md) — complete rule compliance matrix
   with drifts routed to specific follow-up sprints.
2. [`business-owner.md`](./business-owner.md) — priority tier, success
   criteria, non-goals.
3. Canonical doc set under [`docs/modules/notifications/`](../../notifications/)
   containing all 11 required files with real content derived from the spec
   and from external research, not placeholders.
4. This sprint roadmap (sprints 00–05) authored under
   [`docs/modules/todo/notifications/`](./).

## Acceptance Criteria

- [x] CODE-REVIEW.md cites every ground-truth file by name and marks
  pass/fail per rule.
- [x] Every drift found is routed to a specific follow-up sprint.
- [x] External research captured: Meta signs webhooks with
  `X-Hub-Signature-256` (HMAC-SHA256 over raw body with App Secret); the raw
  body must be read via `request.text()` before any JSON parsing in Next.js 15.
- [x] Canonical doc set scaffolded with 11 files of real content.
- [x] Sprint roadmap enumerates 00–05 with acceptance criteria each.

## Dependencies

- `docs/modules/15-notifications.md` (spec)
- `docs/module-rules.md`
- `docs/modules/20-module-config.md`, `21-module-subscriptions.md`
- Graduated sibling reference (`docs/modules/ai/`) for doc-set tone

## Risks

- **None** — discovery is read-only.

## Test Plan (TDD)

- n/a — no code.

## Rule Compliance Checklist

- [x] Rule 1 (ModuleDefinition) — design only, no code yet
- [x] Rule 3.3 (adapter pattern) — adapter interface confirmed
- [x] Rule 13 — drift identified, fix routed to sprint-03
- [x] Rule 5.1 (tenantId column) — verified in spec section 4

## Sources (external research)

- [Meta — Create a webhook endpoint](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint/)
- [Hookdeck — How to Implement SHA256 Webhook Signature Verification](https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification)
- [Kitson Broadhurst — Next.js App Router + Stripe Webhook Signature Verification](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f)
- [Makerkit — Next.js Route Handlers: The Complete Guide](https://makerkit.dev/blog/tutorials/nextjs-api-best-practices)
- [webhooks.cc — Next.js App Router Webhook Handler Testing Guide](https://webhooks.cc/blog/nextjs-app-router-webhook-handler)
