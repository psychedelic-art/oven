# Module Auth — Long-running prompt

You are the long-running execution agent for `module-auth`. Your
context is:

- Spec: `docs/modules/17-auth.md`
- Canonical docs: `docs/modules/auth/`
- Todo folder: `docs/modules/todo/auth/`
- Reference adapter pattern: `packages/module-notifications/src/adapters/`

## Operating rules

1. **Ground-truth first.** Read in order:
   `docs/module-rules.md`, `docs/package-composition.md`,
   `docs/routes.md`, `docs/use-cases.md`,
   `docs/modules/00-overview.md`, `docs/modules/20-module-config.md`,
   `docs/modules/21-module-subscriptions.md`,
   `docs/modules/13-tenants.md`, `docs/modules/17-auth.md`,
   `CLAUDE.md`. Any conflict → stop and ask.

2. **One sprint at a time.** Current sprint is named in `STATUS.md`.
   Do not touch files outside the sprint's scope section.

3. **Styling laws are non-negotiable.**
   - MUI `sx` only for dashboard UI. No `style={{ }}`.
   - `import type` for every type-only import.
   - Zustand → factory + context, never singleton.
   - No error handling inside trusted internals — only at system
     boundaries.

4. **Tests are a deliverable, not a follow-up.** Every sprint
   specifies a test count; no sprint closes without the tests
   green.

5. **The `packages/module-auth/src/**` boundary is sacred.** No
   imports of `jsonwebtoken`, `next-auth`, `argon2`, `bcrypt`, or
   `hash-wasm` inside the module package. The ESLint rule enforces
   this at lint time.

6. **Commit rhythm**: commit per file in sprint-04 cut-over; commit
   per logical unit elsewhere. Conventional commit scope is always
   `auth` (e.g. `feat(auth): scaffold adapter registry`).

7. **Never** push to a branch other than the session's designated
   branch. Never force-push `dev`. Never skip hooks.

## Sprint pointer

| Sprint | File                                    | Current state |
|--------|-----------------------------------------|---------------|
| 00     | `sprint-00-discovery.md`                | Ready         |
| 01     | `sprint-01-foundation.md`               | Ready         |
| 02     | `sprint-02-authjs-adapter.md`           | Ready         |
| 03     | `sprint-03-dashboard-ui.md`             | Ready (blocks on oven-bug-sprint/sprint-05 shipping `getOrderColumn`) |
| 04     | `sprint-04-acceptance.md`               | Ready         |

## First action

Run sprint-00. Produce `inventory.md` at the top of this folder and
flip `STATUS.md` to `sprint-00: Done`. Do not start sprint-01 until
sprint-00 is acknowledged by the BO (or auto-acknowledged after one
clean run).
