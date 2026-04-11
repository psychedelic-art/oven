# Sprint 02 — WhatsApp Meta Adapter + Webhook Pipeline

## Goal

Ship the first real channel. Land `@oven/notifications-meta` as a separate
adapter package, wire `/api/notifications/whatsapp/webhook` GET + POST
handlers in `module-notifications`, and deliver inbound messages to the
conversation pipeline with HMAC signature verification.

## Scope

### In

- **New package**: `packages/notifications-meta/`
  - `package.json` — declares a peer dep on `@oven/module-notifications` for
    the `NotificationAdapter` interface; no runtime dep on the module.
  - `src/index.ts` — exports `metaAdapter: NotificationAdapter`.
  - `src/signature.ts` — `verifyMetaSignature(rawBody, header, appSecret)`
    using `crypto.createHmac('sha256', secret)` and
    `crypto.timingSafeEqual()` for constant-time comparison.
  - `src/parse.ts` — `parseInboundMetaWebhook(raw)` returning
    `InboundMessage` with the sender phone, text/media content, and the
    external message id.
  - `src/send.ts` — `sendMetaMessage(channel, to, content)` calling the
    Graph API `POST /{apiVersion}/{phoneNumberId}/messages`.
  - `src/__tests__/signature.test.ts`, `parse.test.ts`, `send.test.ts`
    using vitest; all network calls mocked.
- **module-notifications handlers**:
  - `src/api/notifications-whatsapp-webhook.handler.ts` with
    - `GET` — handles `hub.mode=subscribe`; verifies `hub.verify_token`
      against the channel's `webhookVerifyToken`; returns `hub.challenge`
      on success, 403 otherwise.
    - `POST` — reads `request.text()` **before** parsing; looks up the
      channel by `phoneNumberId`; resolves the adapter via the registry;
      calls `adapter.verifyWebhookSignature(req)`; rejects with 401 on
      mismatch; on success, creates / resumes the conversation, records the
      inbound message, increments usage, emits
      `notifications.message.received`, and returns 200.
  - `src/api/notification-channels.handler.ts` — GET list + POST create,
    filtered by tenant; uses `parseListParams` + `listResponse`.
  - `src/api/notification-channels-by-id.handler.ts` — GET + PUT + DELETE.
  - `src/api/notification-conversations.handler.ts` — GET list.
  - `src/api/notification-conversations-by-id.handler.ts` — GET with
    messages.
  - `src/services/conversation-pipeline.ts` — `ingestInboundMessage()`
    encapsulates the lookup / create / record / emit flow.
  - `src/__tests__/webhook-handler.test.ts`,
    `src/__tests__/conversation-pipeline.test.ts` — full coverage with
    mocked db and registry.
- Wire `metaAdapter` via
  `apps/dashboard/src/lib/modules.ts` with
  `registerNotificationAdapter(metaAdapter)` — the dashboard is the only
  place that imports both the module and the adapter package.

### Out

- Outbound response generation (lives in the agent pipeline; webhook just
  delegates)
- Delivery status updates (sprint-03 or a follow-on)
- Twilio / Resend adapters
- Dashboard UI (sprint-04)

## Deliverables

1. `packages/notifications-meta/` shipping `metaAdapter`
2. `src/api/notifications-whatsapp-webhook.handler.ts` with GET + POST
3. CRUD handlers for channels + conversations
4. Conversation pipeline service
5. Vitest coverage for signature verification, parsing, sending, and the
   webhook handler happy-path + signature-fail path
6. Dashboard wiring in `apps/dashboard/src/lib/modules.ts`
7. Commit: `feat(notifications): meta adapter + whatsapp webhook pipeline`
8. Commit: `test(notifications): webhook signature and ingest pipeline`
9. Commit: `docs(notifications): record sprint-02 completion`

## Acceptance Criteria

- [ ] `pnpm --filter @oven/notifications-meta test` green
- [ ] `pnpm --filter @oven/module-notifications test` green
- [ ] Webhook POST with a tampered signature returns 401 and emits no events
- [ ] Webhook POST with a valid signature creates the conversation, inserts
  one message row, increments usage, and emits
  `notifications.message.received` + `notifications.conversation.created`
  (first message only)
- [ ] `request.text()` is called before any `JSON.parse` / `request.json()`
  in the POST handler (verified by the test reading the handler source)
- [ ] `notifications-meta` package does **not** import from
  `@oven/module-notifications/engine` or `/api` — only the
  `/adapters` type surface
- [ ] Dashboard wiring imports in `lib/modules.ts` compile

## Dependencies

- Sprint-01 foundation (schema + adapter registry)
- `module-registry` event bus for emission
- Next.js 15 App Router route handler conventions

## Risks

- **Raw body capture** — some middleware or framework layers re-serialize
  the body before reaching the handler. Mitigation: read the raw text in the
  handler itself and pass it to `verifyWebhookSignature`.
- **Timing-safe compare** — `Buffer.compare` is not constant-time. Must use
  `crypto.timingSafeEqual` on equal-length buffers.
- **Phone number ID lookup uniqueness** — two tenants cannot share a phone
  number ID. Guaranteed by Meta, but we add a `notification_channels`
  composite index on `(adapter_name, config->>'phoneNumberId')` in
  sprint-02 if lookup performance demands.

## Test Plan (TDD)

1. `packages/notifications-meta/src/__tests__/signature.test.ts` — assert
   HMAC matches a known-good fixture and fails on tampered payloads.
2. `packages/notifications-meta/src/__tests__/parse.test.ts` — assert a
   canonical Meta payload maps to the expected `InboundMessage`.
3. `packages/module-notifications/src/__tests__/webhook-handler.test.ts` —
   mock db, registry, and event bus; assert the happy path and the 401 path.
4. Only after the tests are red, implement the handlers.

## Rule Compliance Checklist

- [ ] Rule 3.3 — adapter in a separate package
- [ ] Rule 5.2 — handlers filter by tenant
- [ ] Rule 5.6 — events include tenantId
- [ ] Rule 10.1 — `parseListParams` + `listResponse` used
- [ ] Rule 10.4 — `withHandler` or equivalent error matcher used
- [ ] Rule 10.5 — public endpoints already marked by sprint-01 seed
