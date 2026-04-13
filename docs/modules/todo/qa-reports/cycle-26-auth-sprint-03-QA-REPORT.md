# QA Report — cycle-26 auth sprint-03 dashboard UI

**Branch**: `claude/stoic-hamilton-Nij5c`
**Base**: `origin/dev` at `e74fa08`
**Date**: 2026-04-13

## Commits reviewed

| SHA | Summary |
|-----|---------|
| `77df196` | feat(auth): sprint-03 rate-limit primitive + change-password handler |
| `3b4f02b` | feat(auth): sprint-03 dashboard UI — custom pages + route wiring |
| `0ea7a98` | test(auth): sprint-03 rate-limit + change-password + handler tests (+15) |
| `e1958dc` | docs(auth): update sprint-03 status and progress audit |

## Ground-truth rule compliance

| Rule | Status | Notes |
|------|--------|-------|
| CLAUDE.md no inline `style={{}}` | PASS | `grep -rn 'style={{' apps/dashboard/src/components/auth/` returns 0 matches. Also fixed 2 pre-existing violations in UserShow.tsx and ApiKeyShow.tsx. |
| CLAUDE.md MUI `sx` only | PASS | All 12 auth UI files use MUI `sx` exclusively. No `className` with handwritten CSS. No `styled()`. |
| CLAUDE.md `import type` | PASS | All type-only imports use `import type`. |
| CLAUDE.md zustand factory+context | N/A | No zustand stores in this sprint. |
| CLAUDE.md error handling at boundaries | PASS | Rate limiting is at the system boundary (API endpoints). No unnecessary error handling. |
| module-rules.md R10.1 list handlers | PASS | api-keys.handler.ts and sessions.handler.ts both use `parseListParams` + `listResponse`. |
| secure.md rate limits | PASS | All 4 rate limit rows enforced: login (5/60s), forgot (3/600s), register (5/600s), refresh (60/60s). All verified in tests. |
| 17-auth.md section 6 API | PASS | All endpoints documented in section 6 are implemented. Change-password handler added this sprint. |
| 17-auth.md section 7 Dashboard UI | PASS | LoginPage, ProfilePage (4 tabs), API Key resources all present. Register/Forgot/Reset custom pages added. |
| auth/UI.md | PASS | All page specs matched. ProfilePage has Details, Change Password, Sessions, API Keys tabs as specified. |
| auth/api.md | PASS | All endpoint wire shapes match. change-password returns `{success: true}`. |

## Test results

```
7 test files | 45 tests | 0 failures
  rate-limit.test.ts:         8 pass
  adapter-registry.test.ts:   6 pass
  middleware.test.ts:          6 pass
  change-password.test.ts:    5 pass
  handler-rate-limits.test.ts: 3 pass
  handlers.test.ts:           9 pass
  module-definition.test.ts:  8 pass
```

**Test delta**: +15 (from 30 to 45).

## Typecheck delta

0 new errors. Pre-existing baseline (RouteHandler params, `next/server` resolution) unchanged.

## Files changed

### New files (8)
- `packages/module-registry/src/rate-limit.ts`
- `packages/module-auth/src/api/auth-change-password.handler.ts`
- `apps/dashboard/src/components/auth/RegisterPage.tsx`
- `apps/dashboard/src/components/auth/ForgotPasswordPage.tsx`
- `apps/dashboard/src/components/auth/ResetPasswordPage.tsx`
- `packages/module-auth/src/__tests__/rate-limit.test.ts`
- `packages/module-auth/src/__tests__/change-password.test.ts`
- `packages/module-auth/src/__tests__/handler-rate-limits.test.ts`

### Modified files (12)
- `packages/module-registry/package.json` (new `./rate-limit` export)
- `packages/module-auth/src/index.ts` (change-password handler wiring)
- `packages/module-auth/src/api/auth-login.handler.ts` (rate limit)
- `packages/module-auth/src/api/auth-forgot-password.handler.ts` (rate limit)
- `packages/module-auth/src/api/auth-register.handler.ts` (rate limit)
- `packages/module-auth/src/api/auth-refresh.handler.ts` (rate limit)
- `apps/dashboard/src/components/AdminApp.tsx` (loginPage + routes)
- `apps/dashboard/src/components/auth/LoginPage.tsx` (enhanced)
- `apps/dashboard/src/components/auth/ProfilePage.tsx` (4 tabs)
- `apps/dashboard/src/components/auth/UserShow.tsx` (style fix)
- `apps/dashboard/src/components/auth/ApiKeyShow.tsx` (style fix)
- `pnpm-lock.yaml` (lockfile update from install)

## UI verification

Cannot test UI in browser in this session. All component files verified
for correct imports, MUI sx usage, and proper API endpoint calls.

## Verdict

**PASS** — Ready to merge into dev as cycle-26.
