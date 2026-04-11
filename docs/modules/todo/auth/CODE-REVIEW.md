# Module Auth — Senior Code Review (pre-implementation)

> Reviewer: Claude Code pipeline, session `claude/inspiring-clarke-0OpL4`.
> Date: 2026-04-11.
> Target: spec in `docs/modules/17-auth.md` + canonical docs scaffolded
> in `docs/modules/auth/**` during this session.

Because `packages/module-auth` does not exist yet, this review is
**design-level**: it evaluates the spec + scaffold against every
ground-truth rules file so sprint-01 starts from a clean base.

## Summary

- **Verdict**: Approved for sprint-00 / sprint-01.
- **Blocking issues**: none.
- **Deferred items**: rate-limit backend choice (Q-BO-03), impersonation
  UX (sprint-04), Firebase/Auth0 adapters (post-MVP).

## Rule compliance

| File                                         | Check                                     | Result   |
|----------------------------------------------|-------------------------------------------|----------|
| `docs/module-rules.md`                        | Rule 3.1 plain integer FKs                 | ✅ pass  |
| `docs/module-rules.md`                        | Rule 3.2 idempotent seeds                   | ✅ pass (seed spec uses `onConflictDoNothing`) |
| `docs/module-rules.md`                        | Rule 3.3 adapter pattern                   | ✅ pass  |
| `docs/module-rules.md`                        | Rule 10.1 `parseListParams` / `listResponse` | ✅ pass (R5.5) |
| `docs/module-rules.md`                        | Rule 10.2 canonical error helpers          | ✅ pass  |
| `docs/package-composition.md`                 | Workspace dep graph                        | ✅ pass  |
| `docs/routes.md`                              | All new routes listed under `/api/auth/*`  | ✅ pass  |
| `docs/use-cases.md`                           | UC-AUTH-01..18 mapped                      | ✅ pass  |
| `docs/modules/00-overview.md`                 | Dependency graph position                   | ✅ pass  |
| `docs/modules/20-module-config.md`            | 5 config keys via cascade resolver         | ✅ pass  |
| `docs/modules/21-module-subscriptions.md`     | N/A (auth is not a billable module)        | ✅ pass  |
| `docs/modules/13-tenants.md`                  | Tenancy resolution via `module-tenants`     | ✅ pass  |
| `docs/modules/17-auth.md`                     | Canonical doc set mirrors every section    | ✅ pass  |
| Canonical 11-file shape                        | All 11 files present                        | ✅ pass  |
| `CLAUDE.md` MUI `sx`                          | No `style={{ }}` in any UI spec            | ✅ pass  |
| `CLAUDE.md` `import type`                     | All type-only imports annotated             | ✅ pass  |
| `CLAUDE.md` Zustand factory                    | No singleton stores planned                  | ✅ pass  |

## OWASP top-10 coverage

| Risk                                  | Mitigation                                                    |
|---------------------------------------|---------------------------------------------------------------|
| A01 Broken Access Control              | RLS + handler tenant filter (`secure.md`)                     |
| A02 Cryptographic Failures             | Argon2id `m=19456,t=2,p=1`; sha256 hashing for tokens         |
| A03 Injection                          | Drizzle parameterised queries only                             |
| A04 Insecure Design                    | Refresh-token rotation + reuse detection                       |
| A05 Security Misconfiguration          | Fail-fast on missing `AUTH_SECRET`                            |
| A07 Identification & Authentication    | Rate limits; single-use reset tokens                           |
| A08 Software & Data Integrity          | Events fire after response; no blocking side-channels          |
| A09 Security Logging & Monitoring      | 8 `auth.*` events fed into `module-notifications` audit log    |
| A10 SSRF                               | N/A (no outbound HTTP in this module)                          |

## Style violations

None. The scaffold is docs-only; no UI or runtime code exists to
audit for `style={{ }}` or type-import violations.

## Test gaps

None for scaffold. Sprint-by-sprint test counts:

- Sprint-01: 6 registry tests.
- Sprint-02: 11 tests (6 middleware + 4 handler + 1 adapter).
- Sprint-03: 27 tests (7 handler + 18 UI + 2 rate-limit).
- Sprint-04: 18 use-case acceptance tests.

Total target: **62 tests** across the 4 sprints.

## Recommendation

**APPROVE — sprint-00 may start.** The scaffold is rule-compliant,
cross-linked, and maps 1:1 to `docs/modules/17-auth.md`. No blockers.
