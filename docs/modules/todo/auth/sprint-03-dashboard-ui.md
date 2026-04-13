# Sprint 03 — Dashboard UI + API keys + password flows

## Goal

Ship every auth-related dashboard screen documented in
`docs/modules/auth/UI.md`, plus the `/api/auth/api-keys` +
`/api/auth/forgot-password` + `/api/auth/reset-password` handlers
that the UI consumes.

## Scope

1. **Login page** (`apps/dashboard/src/components/auth/LoginPage.tsx`)
   — full implementation per `UI.md` §/login.
2. **Register page** (`RegisterPage.tsx`) — only rendered when
   `ALLOW_SELF_REGISTRATION = true`. 404-route otherwise.
3. **Forgot / reset password pages** — `ForgotPasswordPage.tsx` and
   `ResetPasswordPage.tsx`.
4. **Profile page** (`ProfilePage.tsx`) with all 4 tabs (details,
   change password, sessions, API keys).
5. **`ApiKeyList.tsx`, `ApiKeyCreate.tsx`, `ApiKeyShow.tsx`** React
   Admin resources.
6. **API handlers** new this sprint:
   - `POST /api/auth/forgot-password`
   - `POST /api/auth/reset-password`
   - `POST /api/auth/change-password`
   - `GET/POST /api/auth/api-keys`
   - `DELETE /api/auth/api-keys/[id]`
   - `GET /api/auth/sessions`
   - `DELETE /api/auth/sessions/[id]`
7. **Rate-limit primitive**: introduce
   `packages/module-registry/src/rate-limit.ts` (or import from an
   existing helper) and wire the 4 rate-limit rows from
   `secure.md` §"Rate Limits".
8. Wire `customRoutes` into the dashboard's `<Admin>`:
   `/login`, `/register`, `/forgot-password`, `/reset-password`,
   `/profile`, `/profile/sessions`.
9. **API-key list sort** uses `getOrderColumn` — consumes the helper
   shipped by `oven-bug-sprint/sprint-05-handler-typesafety`
   (dependency: that sprint must ship first).

## Out of scope

- RLS migration — sprint-04.
- Cut-over of other modules' handlers to `getAuthContext` —
  sprint-04.
- Users admin resource — deferred to a sprint-04 follow-up.

## Deliverables

- 9 new UI files under `apps/dashboard/src/components/auth/`.
- 7 new handlers under `packages/module-auth/src/api/`.
- 1 new rate-limit primitive under
  `packages/module-registry/src/rate-limit.ts`.
- Unit tests:
  - 1 per handler = 7 tests.
  - 2 UI tests per page (happy + error) = 18 tests.
  - 2 tests for the rate limiter = 2 tests.
  - Total: 27 new tests.

## Acceptance criteria

- [x] All 9 UI files contain **zero** `style={{` literals.
- [x] All 9 UI files use MUI `sx` for every styling concern.
- [x] All type-only imports use `import type`.
- [x] Every handler uses `parseListParams` + `listResponse` where it
      is a list handler (R5.5).
- [x] Rate limits from `secure.md` Rate Limits table are enforced in
      tests.
- [ ] Manual golden path verified in the dev server:
      register → login → create API key → revoke key → logout →
      forgot-password → reset → login again.
      (UI cannot be tested in this session — no browser available.)
- [x] Typecheck delta: 0 new errors.
- [x] Lint delta: 0 new warnings.

## Touched packages

- `packages/module-auth` (new handlers)
- `packages/module-registry` (new rate-limit primitive)
- `apps/dashboard` (new UI + custom routes)

## Risks

- **R1**: React Admin dataProvider does not forward `X-Tenant-Id`
  automatically. *Mitigation*: extend the dashboard's custom
  `dataProvider` to inject the active tenant header from the
  `useAuthProvider` hook.
- **R2**: The API-key plaintext reveal dialog must not be dismissible
  without the "stored" checkbox. *Mitigation*: use MUI `Dialog`
  with `disableEscapeKeyDown` and a disabled close button until the
  checkbox is ticked.
- **R3**: `sprint-05-handler-typesafety` of `oven-bug-sprint` must
  ship `getOrderColumn` before this sprint's API-key list handler.
  If it has not, block this sprint at the handler step.

## Rule compliance checklist

- `CLAUDE.md` no inline `style={}` — enforced by grep in CI.
- `CLAUDE.md` MUI `sx` — the single styling mechanism for all 9 UI
  files.
- `CLAUDE.md` `import type` — all type-only imports.
- `docs/module-rules.md` Rule 10.1 list handlers — satisfied.
- `docs/modules/17-auth.md` §6, §7 — fully implemented.
- `docs/modules/auth/UI.md` — one-to-one with the file list above.
