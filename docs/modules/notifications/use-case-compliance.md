# Use-Case Compliance — module-notifications

> Maps `module-notifications` responsibilities back to the platform use
> cases described in [`docs/use-cases.md`](../../use-cases.md). Each use
> case that touches messaging lists the module's contribution and the
> sprint that delivers it.

---

## UC-1 — Initial Platform Setup

**Module contribution**: seeds the `notifications` module's permissions
and marks the WhatsApp webhook routes as public in
`api_endpoint_permissions`. Also contributes three service slugs
(`notifications-whatsapp`, `notifications-sms`, `notifications-email`)
that UC-1 step 2 (service catalog) uses when defining billing plans.

- Sprint-01 adds the seed; operators wire the matching services in the
  service catalog per UC-1 step 2.
- Sprint-03 reads the plan quotas via `module-subscriptions.checkQuota`
  during usage metering.

---

## UC-2 — Onboard a New Tenant

**Module contribution**: once a tenant exists, the operator creates one
or more channels via the dashboard. For dental tenants, the typical
sequence is:

1. Tenant created (module-tenants)
2. Tenant assigned to a billing plan (module-subscriptions) — the plan
   quotas determine WhatsApp / SMS / email limits
3. Create a WhatsApp channel (`notification-channels` resource, sprint-04 UI)
4. Copy the webhook URL from `ChannelShow` and configure it in the
   Meta developer console
5. Paste the Meta `webhookVerifyToken` into the channel edit form
6. Meta sends the verification challenge → handler responds with
   `hub.challenge` (sprint-02)

---

## UC-3 — Configure a Tenant (operational settings)

**Module contribution**: instance-scoped `module-config` keys declared
by this module's `configSchema` are the knobs operators turn per tenant:

| Config key | What it does |
|---|---|
| `USAGE_WARNING_THRESHOLD` | When the warning event + dashboard banner triggers |
| `AUTO_CLOSE_CONVERSATION_HOURS` | Inactivity before auto-closing |
| `ESCALATION_NOTIFY_OFFICE` | Whether to emit an extra notify event on escalation |
| `DEFAULT_WHATSAPP_LIMIT` / `DEFAULT_SMS_LIMIT` / `DEFAULT_EMAIL_LIMIT` | Tier-2 fallback limits when no subscription is attached |

Operators set these via `POST /api/module-configs` with
`moduleName='notifications'` and the appropriate `tenantId`.

---

## UC-N — Runtime conversational flows (new use case)

The existing `docs/use-cases.md` covers platform admin operations. The
dental project (`docs/dental-project.md`) adds a runtime use case not
yet present in `use-cases.md`:

**UC-R1 — Patient asks an FAQ via WhatsApp**

```
1. Patient sends "¿Cuál es el horario del sábado?" to the tenant's WhatsApp number
2. Meta delivers the webhook to /api/notifications/whatsapp/webhook POST
3. Signature verified → conversation opened → message inserted
4. Usage incremented; limit not exceeded
5. Pipeline delegates to module-agent-core with the conversation context
6. Agent searches module-knowledge-base and drafts a reply
7. Pipeline sends the reply via metaAdapter.sendMessage
8. Outbound message persisted; delivery status lifecycle tracked
```

Sprint-05 exercises this flow end-to-end. If all upstream modules are
not yet shipping their runtime, sprint-05 records a "contract-only"
outcome in STATUS.md instead of faking the result.

**UC-R2 — Patient hits the monthly WhatsApp limit**

```
1. Patient sends a 301st WhatsApp message to a tenant on the Free plan
2. incrementUsage brings the counter to 301 (limit=300)
3. notifications.usage.limitExceeded fires exactly once
4. Pipeline inserts an escalation row with reason='limit-exceeded'
5. Pipeline short-circuits: DOES NOT delegate to the agent
6. Outbound reply is a canned "please contact us at …" message with
   the tenant's HUMAN_CONTACT_INFO from module-config
```

Sprint-03 delivers the metering + short-circuit logic; sprint-04
surfaces the escalation in the dashboard Escalations list.

---

## Rule compliance summary (against docs/use-cases.md header modules)

| Use-case header module | Notifications compliance |
|---|---|
| Config (20) | All tenant-customizable settings live in `configSchema`; no new columns on tenants or other identity tables (Rule 13) |
| Tenants (13) | No columns added to tenants; lookups happen via registry |
| Subscriptions (21) | Primary source of usage limits via `checkQuota`; lazy-required so platforms without subscriptions still boot |
| UI Flows (22) | Not touched — conversational flows belong in agent pipelines, not UI flows |
| Forms (19) | Not touched |
| Flows (18) | Not touched |
