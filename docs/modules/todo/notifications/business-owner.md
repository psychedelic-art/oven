# Notifications — Business Owner

> This document captures the business framing for prioritisation. Engineering
> uses it when choosing which sprint to pull next from the queue across
> modules.

## Priority tier

**Tier 1** (dental-project critical path) — notifications is blocking the
WhatsApp FAQ assistant described in `docs/dental-project.md` and the
onboarding steps in `docs/dandia-onboarding-checklist.md`. Without it:

- Dental clinics cannot receive booking requests via WhatsApp.
- The dental FAQ agent (built on module-knowledge-base) has no way to reach
  patients.
- Usage metering for WhatsApp messages, which feeds platform billing, is absent.

## Business value (12-month horizon)

| Outcome | Signal |
|---|---|
| Patient intake via WhatsApp | Inbound messages/month per tenant |
| Reduced front-desk load | Ratio of auto-answered vs escalated conversations |
| Billing enablement | Per-tenant WhatsApp message count surfaced to `module-subscriptions` |
| Upsell path | Tier-based message limits (300 / 1500 / 5000 / unlimited) |

## Stakeholders

- **Dental practice owner** — configures channel, sees usage gauge, reads
  escalations.
- **Front-desk staff** — reads conversations, resolves escalations, takes over
  handoffs.
- **Platform admin** — manages tenant subscriptions, watches aggregate usage.
- **Patient (external user)** — sends WhatsApp messages, receives bot + human
  responses.

## Non-goals (explicit)

- **Marketing blasts / broadcasts** — out of scope. Notifications handles
  conversational messaging, not outbound campaigns.
- **Opt-in management** — deferred until legal review. Per WhatsApp Business
  policy, initial contact must come from the user or via a pre-approved
  template.
- **Voice / video** — not on the roadmap.
- **CRM / funnel tracking** — belongs in a future `module-crm`, not here.

## Success criteria (sprint-05 acceptance)

1. A dental tenant can onboard a Meta WhatsApp channel through the dashboard
   without writing code.
2. An inbound WhatsApp text arrives, is answered by the dental FAQ agent, and
   the reply is delivered with visible delivery status in the dashboard.
3. Usage counter ticks up; at 80% of plan quota the tenant sees a warning
   banner; at 100% inbound messages auto-escalate to contact info.
4. All escalations surface in the Escalations resource with the full
   conversation context.
