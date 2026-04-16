# Sprint 01 — Tier-2 Browser E2E (Playwright)

> **Status: DEFERRED** — captured during cycle-39 for future execution.
> Depends on Tier-1 (sprint-00) harness being in place (it is).

## Goal

Add Playwright-driven browser-level end-to-end tests that exercise the
dashboard + portal UI flows against a real running dev server, a real
Postgres (via pglite-over-http or a Neon preview branch), and the Tier-1
mock AI providers. Validates code paths that Tier-1 cannot reach:
React rendering, router navigation, auth session, form submission,
SSE rendering in the browser, file upload UX, and the agent-ui widget
mounted in a host page.

## Non-goals

- Production smoke tests against a live deployment — that is Tier-3
  (sprint-02).
- Replacing unit tests or Tier-1 — Tier-2 is additive, targeting UX
  regressions that Tier-1 cannot catch.

## Deliverables

1. **Playwright workspace** — new `packages/e2e-browser/` package with
   `playwright.config.ts`, `@playwright/test` as devDep, a single
   `projects: [{ name: 'chromium' }]` entry initially. Add a
   `pnpm test:browser` script in the root `package.json` and a
   corresponding `turbo.json` task with `cache: false` and
   `persistent: false`.

2. **Test-server bootstrap** — reuse `bootstrapHarness()` from
   `@oven/test-harness` to pre-seed a pglite instance, then start
   `apps/dashboard` via `next dev --port 4010` with an env override that
   points the registry at the harness DB. Teardown stops the dev server
   and closes pglite.

3. **Mock-AI injection** — Playwright global-setup hook installs the
   same `mockAiModule` shims used in Tier-1, so browser tests never touch
   real LLM providers. Exposes `queueAssistant` / `queueToolCall` through
   a Playwright fixture so specs can queue responses per-test.

4. **Initial spec set** (minimum to graduate the sprint):
   - `dashboard-login.spec.ts` — auth stub → dashboard loads.
   - `playground-chat-stream.spec.ts` — send a prompt, assert
     streaming tokens render in the chat pane, assistant bubble
     persists after reload.
   - `playground-session-sidebar.spec.ts` — create, pin, rename,
     export, delete a session via the UI.
   - `kb-admin-create-entry.spec.ts` — create a KB entry via the admin
     form, embed via queued mock, verify semantic search returns it.
   - `agent-ui-widget-embed.spec.ts` — mount the widget script in a
     static HTML fixture page, verify streaming + tool-call rendering.

5. **CI hook** — GitHub Actions workflow `e2e-browser.yml` runs the
   browser suite on PRs that touch `apps/**` or `packages/agent-ui/**`
   or `packages/dashboard-ui/**`. Skips on doc-only PRs via path
   filters.

## Design decisions to lock before executing

- **Real Postgres vs pglite-over-HTTP.** pglite has an HTTP shim; test
  whether Neon-serverless can talk to it. If yes, zero Docker. If no,
  introduce a Neon preview branch provisioned per CI run.
- **Auth stub.** Current repo has no auth provider wired. Tier-2 will
  ship an `E2E_AUTH_BYPASS=1` env flag that short-circuits the layout's
  permission check. Must be unreachable in production builds (guarded by
  `NODE_ENV !== 'production'`).
- **Parallelism.** Start with `workers: 1` to avoid DB state bleed;
  revisit once fixtures clone the pglite snapshot per-worker.

## Dependencies on other sprints

- **BLOCKS no current sprint.** Playwright lives alongside the unit/
  Tier-1 stack; nothing gates on it.
- **UNBLOCKED BY cycle-39 sprint-00.** The harness bootstrap, mock-AI
  aliasing, and fixture helpers are reused wholesale.

## Acceptance criteria

- [ ] `pnpm test:browser` runs the 5 initial specs green locally on
      Linux (CI-matched).
- [ ] The auth bypass cannot be activated when `NODE_ENV=production`
      (guarded with an explicit assertion test).
- [ ] CI workflow file exists and passes on a sample PR that touches
      `apps/dashboard`.
- [ ] Aggregate test count recorded in `docs/modules/todo/PROGRESS.md`
      under the relevant cycle row.

## Open questions

- Should the widget-embed spec run against `next dev` or a pre-built
  static export? Preference is pre-built static so we catch bundle
  regressions separately from dev-server behaviour.
- Per-test DB isolation vs per-suite. Per-suite is simpler; per-test is
  safer for flaky ordering. Default to per-suite + explicit cleanup
  helpers, upgrade to per-test if flake rate > 1%.
