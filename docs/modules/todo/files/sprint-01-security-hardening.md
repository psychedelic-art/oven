# sprint-01-security-hardening — Module Files

## Goal

Close **F-05-01** in `@oven/module-files`: eliminate the unsafe
`(files as any)[params.sort] ?? files.id` sort-injection pattern from
`packages/module-files/src/api/files.handler.ts:12`, replace it with
the proven `getOrderColumn` allowlist helper (copied from
`packages/module-ai/src/api/_utils/sort.ts` per IP-4), and add vitest
coverage mirroring the cycle-3 reference tests in
`packages/module-ai/src/__tests__/ai-sort-guard.test.ts`.

## Scope

- `packages/module-files/src/api/_utils/sort.ts` — NEW. Verbatim
  copy of the reference helper.
- `packages/module-files/src/api/files.handler.ts` — MODIFIED.
  Replace the unsafe line with the helper + `ALLOWED_SORTS`
  tuple + `badRequest` branch.
- `packages/module-files/src/__tests__/sort-guard.test.ts` — NEW.
  8 vitest tests.
- `packages/module-files/vitest.config.ts` — NEW. Minimal config
  matching `packages/module-tenants/vitest.config.ts`.
- `packages/module-files/package.json` — MODIFIED if missing the
  `test` script or vitest devDep.

## Out of scope

- MIME / size / magic-byte validation (sprint-02).
- Tenant-id clamping (sprint-02).
- Handler refactor for upload processor adapter injection
  (sprint-02).
- Any UI work.

## Deliverables

### 1. Package-private sort helper

File: `packages/module-files/src/api/_utils/sort.ts`.

**Contents**: identical to
`packages/module-ai/src/api/_utils/sort.ts` with the IP-4 comment
block preserved. The helper must be package-private; no export
from `packages/module-files/src/index.ts`.

```ts
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

export type SortResolution =
  | { ok: true; column: PgColumn }
  | { ok: false; allowed: readonly string[]; received: string };

export function getOrderColumn<T extends PgTable>(
  table: T,
  field: string,
  allowed: readonly (keyof T)[],
): SortResolution {
  if (!(allowed as readonly string[]).includes(field)) {
    return { ok: false, allowed: allowed as readonly string[], received: field };
  }
  const column = (table as Record<string, unknown>)[field];
  if (column === undefined || column === null) {
    return { ok: false, allowed: allowed as readonly string[], received: field };
  }
  return { ok: true, column: column as PgColumn };
}
```

### 2. Handler rewrite

File: `packages/module-files/src/api/files.handler.ts`.

- Add `badRequest` to the existing
  `import { parseListParams, listResponse } from '@oven/module-registry/api-utils'`.
- Add `import { getOrderColumn } from './_utils/sort'`.
- Define `const ALLOWED_SORTS = ['id', 'tenantId', 'filename',
  'mimeType', 'sizeBytes', 'folder', 'sourceModule', 'createdAt']
  as const;` at module scope.
- Replace the unsafe line with:

  ```ts
  const resolved = getOrderColumn(files, params.sort, ALLOWED_SORTS);
  if (!resolved.ok) {
    return badRequest(
      `Invalid sort field "${resolved.received}". Allowed: ${resolved.allowed.join(', ')}`,
    );
  }
  const orderFn = params.order === 'desc' ? desc(resolved.column) : asc(resolved.column);
  ```

- Leave the filter logic untouched.

### 3. Unit tests

File: `packages/module-files/src/__tests__/sort-guard.test.ts`. 10
tests, building on `ai-sort-guard.test.ts`:

1. every valid column in `ALLOWED_SORTS` resolves with `ok: true`
   and a defined column reference.
2. an unknown table column (e.g. `storageKey`) resolves with
   `ok: false` — real column on the table, not in the allowlist.
3. a SQL-injection-shaped string resolves with `ok: false`.
4. an empty string resolves with `ok: false`.
5. the `constructor` prototype-key string resolves with `ok: false`.
6. the `__proto__` prototype-pollution guard resolves with
   `ok: false`.
7. a case-mismatched field (`'ID'`) resolves with `ok: false`
   (case-sensitive allowlist).
8. the returned `column` is `===` to `files.id` when the field is
   `'id'` (column reference identity).
9. the returned `column` is `===` to `files.createdAt` when the
   field is `'createdAt'`.
10. `ALLOWED_SORTS` is exactly the 8 documented fields (no drift
    guard — this is the single most important regression test
    because it makes the test suite catch an accidental allowlist
    expansion).

### 4. Vitest config

File: `packages/module-files/vitest.config.ts`. Match
`packages/module-tenants/vitest.config.ts` exactly.

### 5. package.json

If the package already has `"test": "vitest run"`, leave it. If
not, add it and add `vitest` to `devDependencies` at the same
version as siblings (`3.2.4`). Run `pnpm install` at the repo root.

## Acceptance criteria

- [x] `packages/module-files/src/api/_utils/sort.ts` exists and is
      a verbatim copy of the reference (minus the `module-ai`
      comment anchor).
- [x] `packages/module-files/src/api/files.handler.ts` has zero
      `(files as any)` casts.
- [x] `packages/module-files/src/__tests__/sort-guard.test.ts`
      has at least 8 tests, all green. (Shipped: 10 tests.)
- [x] `pnpm --filter @oven/module-files test` runs green.
- [x] `pnpm install --prefer-offline` at the repo root completes
      without lockfile errors.
- [x] No changes to `packages/module-files/src/engine/**`.
- [x] No changes to the filter logic in the handler.
- [x] `STATUS.md` marks sprint-01 complete and updates the
      "Known gaps" table (row #1 closed).

## Dependencies

- `packages/module-ai/src/api/_utils/sort.ts` must exist on the
  branch we start from. Confirmed — landed cycle-3, merged cycle-4
  via M7sl8.
- `@oven/module-registry/api-utils` must export `badRequest`.
  Confirmed — already used by `ai-playground-executions.handler.ts`.

## Risks

- **Drift between the two copies of `getOrderColumn`**. Mitigation:
  tech-debt ticket in `secure.md` §Open items to promote the helper
  to `@oven/module-registry/api-utils` once the fourth consumer
  appears.
- **Hidden imports of the helper from outside the package**.
  Mitigation: `grep -rn 'from.*module-files.*sort' apps/ packages/`
  after the sprint lands; should return zero results.

## Test plan

```
pnpm --filter @oven/module-files test

Actual (cycle-4 Phase 4):
  ✓ src/__tests__/sort-guard.test.ts (10 tests)
  Test Files  1 passed (1)
       Tests  10 passed (10)
  Duration  1.73s
```

Regression: `pnpm --filter @oven/module-ai test` must still show
the 8 `ai-sort-guard` tests passing (cross-reference check that we
didn't accidentally move anything).

## Rule Compliance checklist

| Ground truth | Applicable | How |
|---|---|---|
| `docs/module-rules.md` | Yes | Rule 3.1 — no import from `@oven/module-ai`. Copy, don't import. IP-4 enforced. |
| `docs/package-composition.md` | Yes | The helper is package-private. Not exported from `index.ts`. |
| `docs/routes.md` | N/A | No route changes. |
| `docs/use-cases.md` | N/A | No use-case changes. |
| `docs/modules/00-overview.md` | N/A | — |
| `docs/modules/13-tenants.md` | N/A | — |
| `docs/modules/17-auth.md` | N/A | — |
| `docs/modules/14-files.md` | Yes | API handler example §11 now compliant with F-05-01 fix. |
| Root `CLAUDE.md` — `import type` | Yes | `import type { PgColumn, PgTable }` in the new helper. |
| Root `CLAUDE.md` — error handling only at boundaries | Yes | Helper returns discriminated union; handler catches and maps to `badRequest`. |
