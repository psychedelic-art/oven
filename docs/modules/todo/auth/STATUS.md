# Module Auth — STATUS

> Owner: long-running Claude Code auth execution pipeline.
> Updated: 2026-04-13 (cycle-26)

## Active sprint

**`sprint-03-dashboard-ui`** -- Done (rate-limit primitive, change-password handler, 5 custom pages, route wiring, style fixes, 15 new tests).
Next: `sprint-04-acceptance`.

## History

| Date       | Event                                                         | Commit SHA |
|------------|---------------------------------------------------------------|------------|
| 2026-04-11 | Canonical doc set scaffolded under `docs/modules/auth/`       | (in cycle-3) |
| 2026-04-11 | Todo folder scaffolded under `docs/modules/todo/auth/`        | (in cycle-3) |
| 2026-04-12 | Sprint-00 discovery: inventory.md written with 16 hits.       | (cycle-15b) |
| 2026-04-12 | Sprint-01 foundation: vitest infra, 6 adapter-registry tests, 8 module-definition tests. Total: 14 tests. | (cycle-17) |
| 2026-04-12 | Sprint-02 authjs-adapter: 6 middleware tests + 9 handler tests + 1 Argon2id roundtrip. Total: 30 tests (14 + 16). | (cycle-20) |
| 2026-04-13 | Sprint-03 dashboard-ui: rate-limit primitive, change-password handler, 5 custom pages (Login/Register/Forgot/Reset/Profile with tabs), route wiring, style fixes, 15 new tests. Total: 45 tests. | (cycle-26) |

## Backup branches

- `bk/claude-stoic-hamilton-8IRlF-20260412` (cycle-17 session)

## QA outcomes

Sprint-03: rate-limit primitive in `@oven/module-registry/rate-limit`.
Change-password handler wired into module definition.
Rate limiting on login (5/60s), forgot-password (3/600s), register (5/600s), refresh (60/60s).
5 UI pages: LoginPage (enhanced), RegisterPage, ForgotPasswordPage, ResetPasswordPage, ProfilePage (4 tabs).
Custom route wiring for /register, /forgot-password, /reset-password, /profile/sessions.
Admin loginPage prop wired. noLayout routes for public pages.
Style fixes: removed inline `style={{}}` from UserShow.tsx and ApiKeyShow.tsx.
45/45 tests green. 0 new typecheck errors. 0 style violations.

## Blockers

None. Ready for sprint-04-acceptance.

## Dependencies watch

- **`module-roles`** -- `getPermissionsForUser(userId, tenantId)` needed for sprint-04.
- **`module-tenants`** -- `getMembershipsForUser(userId)` needed for middleware enrichment.
