# Module Auth — Use Case Compliance

Maps each use case from `docs/use-cases.md` to the auth-module
requirement that satisfies it. Every use case in the global list that
touches authentication or authorization is accounted for — use cases
that are not auth-related are listed with `n/a`.

> Source of truth: `docs/use-cases.md` and `docs/modules/17-auth.md`.

## Use cases covered

| Use case                                                | Requirement(s)                   | Sprint  |
|---------------------------------------------------------|----------------------------------|---------|
| UC-AUTH-01 Dashboard admin login                        | R2.1, R2.2, R4.1, R4.2           | sprint-02 |
| UC-AUTH-02 Dashboard admin logout                        | R4.5, R7.1                       | sprint-02 |
| UC-AUTH-03 Persistent "remember me" session              | R4.2, R4.4                       | sprint-02 |
| UC-AUTH-04 Password reset via email                      | R6.2, R6.3, R6.4                 | sprint-02 |
| UC-AUTH-05 Admin invites a new user                       | R6.1 (hash via adapter)          | sprint-04 |
| UC-AUTH-06 Self-registration (config-gated)              | R6.1, `ALLOW_SELF_REGISTRATION`  | sprint-03 |
| UC-AUTH-07 Create programmatic API key                    | R5.1, R5.2, R5.5                 | sprint-03 |
| UC-AUTH-08 Revoke a compromised API key                   | R5.3                             | sprint-03 |
| UC-AUTH-09 External webhook calls `/api/...` with key    | R2.1, R5.4                       | sprint-02 |
| UC-AUTH-10 Anonymous chat widget user                     | R2.1, R3.5                       | sprint-03 |
| UC-AUTH-11 Active session inventory                      | R4.1, R7.1                       | sprint-03 |
| UC-AUTH-12 Revoke a single session                        | R4.5                             | sprint-03 |
| UC-AUTH-13 Tenant switching for multi-tenant users        | R3.1, R3.2, R3.3                 | sprint-02 |
| UC-AUTH-14 Platform admin impersonates a tenant           | R9.1 (gated by `platform_admin`) | sprint-04 |
| UC-AUTH-15 Workflow step revokes user sessions            | R4.5 (module export)             | sprint-04 |
| UC-AUTH-16 Permission-gated API handler                  | R10.1, `getAuthContext`          | sprint-02 |
| UC-AUTH-17 RLS enforced cross-tenant read block          | R9.1, `secure.md` policies       | sprint-04 |
| UC-AUTH-18 Rate-limited login defeats credential stuffing | R9.3                             | sprint-02 |

## Rule compliance sections

### `docs/module-rules.md`

- Rule 3.1 (plain integer FKs) — `database.md` declares `userId`,
  `tenantId`, `defaultTenantId` without Drizzle `references()`.
- Rule 3.2 (idempotent seeds) — `seed.ts` uses `onConflictDoNothing`.
- Rule 3.3 (adapter pattern for multi-provider) — R1 set.
- Rule 10.1 (`parseListParams` + `listResponse`) — R5.5.
- Rule 10.2 (error helpers) — `architecture.md` §4 closed error code
  set implemented via `unauthorized()` / `forbidden()`.

### `docs/package-composition.md`

- Every package dependency listed in `docs/modules/17-auth.md`
  section "Dependencies" maps to an entry in
  `packages/module-auth/package.json` through the standard workspace
  protocol.
- No version pinning in the module package; peer deps declared on
  `next`, `drizzle-orm`, `zod`.

### `docs/routes.md`

- Every route in `api.md` appears in the global route table under
  `/api/auth/*`. No duplicates.
- Public routes match the `isPublic = true` seed entries.

### `docs/use-cases.md`

- Covered in the table above.

### `docs/modules/00-overview.md`

- `auth` module is listed in the platform-wide dependency graph
  below `module-registry` and above every handler-carrying module.

### `docs/modules/20-module-config.md`

- 5 config keys consumed through the cascade resolver. All marked
  `instanceScoped: false` in `module-design.md`.

### `docs/modules/21-module-subscriptions.md`

- Auth is not a billable module. No subscription hooks.

### `docs/modules/13-tenants.md`

- `module-auth` depends on `module-tenants.getMembershipsForUser`.
  Middleware resolves tenancy before handlers see the request.

### `docs/modules/17-auth.md`

- The canonical doc set is a refinement of the top-level spec. Every
  section of the spec has a corresponding doc here:
  §1 Overview → `Readme.md`; §2 Core concepts → `Readme.md`;
  §3 Adapter interface → `module-design.md`;
  §4 DB schema → `database.md`; §4 Middleware → `architecture.md`;
  §5 Token utilities → `module-design.md`;
  §6 API endpoints → `api.md`; §7 Dashboard UI → `UI.md`;
  §8 Events → `module-design.md`; §9 Integration → `architecture.md`;
  §10 ModuleDefinition → `module-design.md`;
  §11 Seed → `database.md`; §12 Handler example → `prompts.md`.

### `CLAUDE.md`

- No inline `style={}` in any UI file (`UI.md` + `prompts.md`).
- MUI `sx` prop used for all dashboard styling.
- `import type` for every type-only import in every snippet.
- No Zustand singleton stores — module does not introduce one, but
  if it did (test support), it would follow the factory + context
  pattern.

### Canonical doc shape

Checked: this folder contains all 11 files (Readme.md, UI.md, api.md,
architecture.md, database.md, detailed-requirements.md, module-design.md,
prompts.md, references.md, secure.md, use-case-compliance.md).
