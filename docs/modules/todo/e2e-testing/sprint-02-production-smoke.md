# Sprint 02 — Tier-3 Production Smoke Tests

> **Status: DEFERRED** — captured during cycle-39 for future execution.
> Depends on Tier-1 (sprint-00 LIVE) and ideally Tier-2 (sprint-01) so
> we can reuse shared Playwright primitives. Does not strictly require
> Tier-2 to exist.

## Goal

A small, fast, cheap, read-mostly suite that runs against a **deployed
preview URL** (or production, with explicit opt-in) to catch regressions
that only manifest in the real deployment — real env vars, real auth
provider, real LLM costs, real database migrations actually applied.

Tier-3 is explicitly **not** a replacement for Tier-1 or Tier-2. It is a
final safety net.

## Non-goals

- Full browser UX coverage (that is Tier-2).
- Load / stress / chaos testing — out of scope; if needed, adopt k6 in a
  separate program.
- Data-destructive flows. Tier-3 is read-mostly; any write flow must
  clean up after itself or target an isolated tenant scoped for smoke.

## Scope — a tight ~10-check matrix

| # | Endpoint / flow | Method | Assertion |
|---|-----------------|--------|-----------|
| 1 | `/api/health` | GET | 200 + `{ status: 'ok', version: <sha> }` |
| 2 | `/api/chat-sessions?limit=1` | GET | 200 + well-formed list envelope |
| 3 | `/api/chat-sessions/:id/messages?stream=true` | POST | SSE stream opens, at least one `token` frame received, stream closes with `done` |
| 4 | `/api/agent-workflows` | GET | 200, array shape |
| 5 | `/api/knowledge-base/search?q=...` | GET | 200, no 5xx regardless of match count |
| 6 | `/_next/static/<current-hash>/pages/_app.js` | GET | 200 + correct Content-Type (catches broken CDN) |
| 7 | Widget bundle URL | GET | 200, size within budget (catches regressed bundle) |
| 8 | Auth provider discovery | GET `/.well-known/openid-configuration` on provider | 200 (catches config drift) |
| 9 | Database connectivity indirectly via chat-sessions endpoint | GET | 200 (any 5xx = DB/Neon regression) |
| 10 | `/api/subscriptions/plans` (public pricing) | GET | 200 + at least one plan |

## Implementation shape

1. **Package** — `packages/e2e-smoke/`. Just a Vitest project (no
   Playwright needed; `fetch` is enough). Env-driven:
   ```
   OVEN_SMOKE_BASE_URL=https://preview-xyz.vercel.app pnpm test:smoke
   ```

2. **Secrets** — smoke tests never hardcode credentials. A
   `SMOKE_API_TOKEN` env var, scoped to a dedicated `smoke-tester`
   service account with read-only permissions on the real subscription +
   an isolated tenant, is injected by GitHub Actions.

3. **Cost guard** — the one streaming check (row 3) explicitly pins
   `max_tokens: 32` and uses an LLM model env-override so preview runs
   can point at the cheapest available model. Hard abort if the total
   streamed character count exceeds 1,000 to catch runaway generations.

4. **Scheduling**:
   - Every PR merge to `dev` → auto-run against dev preview URL.
   - Hourly cron against production (opt-in env flag, initially off).
   - Failure → page `#alerts` channel (channel wiring is out of scope
     for this sprint, document the hook only).

5. **Output** — JUnit XML + a one-page HTML summary uploaded as a CI
   artifact. No flaky retries — a single failure fails the run.

## Dependencies

- **BLOCKS no current sprint.**
- **UNBLOCKED BY cycle-39 sprint-00.** Reuses `consumeSSE`/`collectSSE`
  helpers for the streaming check (copy-and-adapt; `test-harness`
  remains a devDep of the smoke package).

## Acceptance criteria

- [ ] `pnpm test:smoke` passes against a fresh preview URL in < 60s.
- [ ] Each of the 10 checks is independently runnable via
      `--testNamePattern`.
- [ ] Cost guard fires correctly when an LLM runs away (tested by
      pointing at a mock endpoint returning a 2,000-char string).
- [ ] GitHub Actions workflow `e2e-smoke.yml` exists, is triggered on
      `workflow_run: merge-to-dev`, and uploads artifacts.
- [ ] Runbook entry in `docs/runbooks/smoke-failure.md` explains what
      each check means and common root causes.

## Open questions

- **Which environment gets hourly smokes?** Preview or production.
  Default to preview only for the first cycle; production opt-in
  after two weeks of zero false-positives.
- **Model override policy.** Should smoke always use a cheap model, or
  match the default config? Current lean: always cheap, with a single
  weekly run on the real default to catch model-specific regressions.
- **Widget bundle check URL.** Widget is published to a CDN path;
  document the canonical URL in `packages/agent-ui/BROWSER-MATRIX.md`
  and reference it from this sprint.
