# Business Owner — Module Auth

## Priority

**P1** — Foundational. Every dashboard and portal flow depends on
uniform authentication. Several `oven-bug-sprint` findings (cross-
tenant reads, inconsistent 401/403 shapes) cannot be fixed
permanently until `module-auth` ships.

## Business value

1. **Tenant isolation** — RLS + a single middleware point ends the
   class of bugs where a handler forgets to scope by tenant.
2. **Integration velocity** — webhook and CI integrations can call
   `/api/*` with an API key that takes 5 seconds to mint in the
   dashboard, vs. today's ad-hoc token situation.
3. **Provider portability** — on-premise dental clinics that run
   Firebase for their own reasons can plug in `auth-firebase`
   without touching handler code.
4. **Audit trail** — the 8 `auth.*` events fed into
   `module-notifications` give compliance a durable record of every
   login, logout, password change, and key creation.

## Acceptance from BO

- Dashboard login works against a Neon DB with at least 1 seeded
  tenant and 1 admin user.
- API-key create flow shows the plaintext exactly once and forces
  the user to acknowledge before closing.
- Forgot-password email flow works end-to-end in the staging
  environment.
- Revoke session terminates the session within 1 minute.
- Every acceptance test from sprint-04 passes in CI.

## Open questions

1. **Q-BO-01** — Do we ship self-registration in the MVP?
   *Proposed answer*: No; gated by `ALLOW_SELF_REGISTRATION = false`
   default. Platform admins invite users. Revisit after first 10
   tenants onboard.
2. **Q-BO-02** — What is the refresh-token lifetime?
   *Proposed answer*: 7 days. Matches NextAuth default.
3. **Q-BO-03** — Rate-limit backend: in-memory (single process) or
   Redis?
   *Proposed answer*: In-memory for MVP; swap to Redis once the
   dashboard is multi-instance.
4. **Q-BO-04** — Do API keys inherit user permissions or always
   carry their own explicit set?
   *Proposed answer*: Default to inherit (`permissions: null`),
   allow explicit override. Matches `17-auth.md` §4
   `api_keys.permissions` semantics.
5. **Q-BO-05** — Should the middleware return 404 or 403 for
   cross-tenant access attempts?
   *Proposed answer*: **403** with code `AUTH_TENANT_FORBIDDEN`. 404
   would mask the tenancy boundary.

None of these open questions block sprint-00 or sprint-01. They are
flagged here so the BO can confirm before sprint-02 ships its first
handler.

## Success metrics

- **0** cross-tenant leak findings in the next `oven-bug-sprint`
  inventory re-run.
- **≤ 200 ms** p50 latency for the middleware (measured with a
  synthetic permission-set of 50 slugs).
- **≥ 95 %** of call sites from sprint-00 `inventory.md` cut over to
  `getAuthContext` by sprint-04 acceptance.
