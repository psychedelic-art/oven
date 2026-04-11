# sprint-03-tenant-scoping — Module Files

## Goal

Enforce tenant scoping on every read/write endpoint of
`@oven/module-files`. A file belonging to tenant A must not be
listable, readable, or deletable by tenant B. Cross-tenant access
returns `404 Not Found` (never `403 Forbidden`) so file existence
is not leaked. Add the two deferred config keys from spec §9 and
integration tests at the `NextRequest` level.

## Scope

- `packages/module-files/src/api/files.handler.ts` — MODIFIED.
  List filter respects the caller's tenant set; platform-global
  rows (`tenantId IS NULL`) are always included.
- `packages/module-files/src/api/files-by-id.handler.ts` —
  MODIFIED. GET returns 404 on cross-tenant; DELETE returns 404
  on cross-tenant.
- `packages/module-files/src/index.ts` — MODIFIED. Add
  `THUMBNAIL_MAX_SIZE` (default 200, not instance-scoped) and
  `MAX_FILES_PER_TENANT` (default 0 = unlimited, instance-scoped)
  to `configSchema`.
- `packages/module-files/src/__tests__/handlers/list.test.ts` —
  NEW. Integration test.
- `packages/module-files/src/__tests__/handlers/get.test.ts` —
  NEW.
- `packages/module-files/src/__tests__/handlers/delete.test.ts` —
  NEW.

## Out of scope

- RLS policies (blocked on `module-auth`; captured as a deferred
  item in `secure.md`).
- Nightly orphan reconciliation job (deferred, not scheduled).
- Upload-path tenant clamp (already done in sprint-02).

## Deliverables

### 1. List tenant filter

```ts
const callerTenantIds = await getTenantIdsFromRequest(request);

const conditions: any[] = [];
conditions.push(
  or(
    isNull(files.tenantId),
    inArray(files.tenantId, callerTenantIds),
  ),
);
// ... rest of filters ...
```

Platform admins get all tenants via `getTenantIdsFromRequest`
returning the full list; regular users get their single tenant;
cross-tenant ids are stripped by the DB filter, not by a post-
query scan.

### 2. Get / Delete 404-on-cross-tenant

```ts
const [row] = await db.select().from(files).where(eq(files.id, id)).limit(1);
if (!row) return notFound();
if (row.tenantId != null && !callerTenantIds.includes(row.tenantId)) {
  return notFound();  // NOT 403 — leak guard
}
```

The `notFound()` helper should already exist in
`@oven/module-registry/api-utils`; if not, this sprint adds it
alongside `badRequest`.

### 3. Config schema additions

```ts
configSchema: [
  // ... existing two entries ...
  {
    key: 'THUMBNAIL_MAX_SIZE',
    type: 'number',
    description: 'Maximum thumbnail dimension in pixels',
    defaultValue: 200,
    instanceScoped: false,
  },
  {
    key: 'MAX_FILES_PER_TENANT',
    type: 'number',
    description: 'Maximum total files per tenant (0 = unlimited)',
    defaultValue: 0,
    instanceScoped: true,
  },
],
```

### 4. Integration tests

Follow the pattern from
`packages/module-tenants/src/__tests__/` (or whichever sibling has
established the integration-test framework). Each test uses a stub
`getDb()` and asserts the HTTP status + response body shape.

- `list.test.ts`:
  - lists files for a single tenant caller.
  - hides files from other tenants.
  - always includes platform-global rows.
  - returns `400` on invalid sort (regression against sprint-01).
- `get.test.ts`:
  - returns file for same-tenant caller.
  - returns `404` for cross-tenant caller (NOT 403).
  - returns `404` for missing id.
- `delete.test.ts`:
  - deletes file for same-tenant caller; calls adapter.delete.
  - returns `404` for cross-tenant caller without calling
    adapter.delete.

### 5. Handler-level idempotent delete

On adapter failure after DB delete has committed, log and continue.
The test file covers this with a stub adapter that throws.

## Acceptance criteria

- [x] List, get, delete all respect the JWT tenant set.
- [x] Cross-tenant access returns 404, never 403.
- [x] `configSchema` has exactly 4 entries.
- [x] `handlers/list.test.ts`, `handlers/get.test.ts`,
      `handlers/delete.test.ts` exist and are green.
- [x] `pnpm --filter @oven/module-files test` green.
- [x] `STATUS.md` closes gaps #6, #12.

## Dependencies

- `module-auth` SSR tenant helper (same dependency as sprint-02).
  If not ready, this sprint is BLOCKED. Do not ship a stub.

## Risks

- **Platform-global rows accidentally filtered out** — covered by
  the `isNull(files.tenantId) OR ...` filter, but the list test
  must assert it.
- **Deletes that partially fail** — captured as a LOG + continue
  pattern; tested explicitly.

## Test plan

```
pnpm --filter @oven/module-files test

Expected:
  ✓ src/__tests__/sort-guard.test.ts
  ✓ src/__tests__/magic-bytes.test.ts
  ✓ src/__tests__/upload-processor.test.ts
  ✓ src/__tests__/handlers/list.test.ts
  ✓ src/__tests__/handlers/get.test.ts
  ✓ src/__tests__/handlers/delete.test.ts
```

## Rule Compliance checklist

| Ground truth | Applicable | How |
|---|---|---|
| `docs/module-rules.md` | Yes | No cross-module direct imports; tenant resolution via `module-auth` public export. |
| `docs/modules/13-tenants.md` | Yes | Tenancy contract enforced. |
| `docs/modules/17-auth.md` | Yes | JWT tenant-set shape consumed. |
| Root `CLAUDE.md` — error handling only at boundaries | Yes | `notFound()` at handler boundary. |
| Root `CLAUDE.md` — `import type` | Yes | Drizzle type imports. |
