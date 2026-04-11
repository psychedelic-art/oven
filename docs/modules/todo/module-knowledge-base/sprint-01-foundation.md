# Sprint 01 — Foundation (`module-knowledge-base`)

> Create the package shell with schema, types, seed stub, and a minimal
> `ModuleDefinition`. No business logic, no API handlers, no UI. The goal
> is "package builds, typechecks, lints, and can be registered".

---

## Goal

Land a buildable `packages/module-knowledge-base/` package that exports a
compilable `ModuleDefinition` with schema, seed stub, config schema, event
schemas, and chat block metadata. No handlers are wired — `apiHandlers`
is `{}` in this sprint. Registration in `apps/dashboard/src/lib/modules.ts`
is **deferred** to sprint 04 to avoid breaking the dashboard boot during
the intervening sprints.

## Scope

1. `packages/module-knowledge-base/package.json`
2. `packages/module-knowledge-base/tsconfig.json`
3. `packages/module-knowledge-base/vitest.config.ts`
4. `packages/module-knowledge-base/src/schema.ts` — `kb_categories`,
   `kb_entries`, `kb_entry_versions` tables without the `embedding`
   vector column (deferred to sprint 02).
5. `packages/module-knowledge-base/src/types.ts` — inferred types +
   domain types (`SearchResult`, `SearchRequest`, etc.).
6. `packages/module-knowledge-base/src/seed.ts` — idempotent no-op stub
   (permissions + categories arrive in sprint 02).
7. `packages/module-knowledge-base/src/index.ts` — `ModuleDefinition`
   with `name`, `dependencies`, `description`, `capabilities`, `schema`,
   `seed`, `resources: []`, `apiHandlers: {}`, `configSchema`, `events`,
   `chat` block (with the `kb.searchEntries` tool name).
8. `packages/module-knowledge-base/src/__tests__/module-definition.test.ts`
   — baseline TDD test: `subscriptionsModule.name === 'knowledge-base'`,
   schema exports expected tables, events list covers expected names,
   chat block uses `kb.searchEntries`.
9. Update `docs/modules/knowledge-base/api.md` MCP block and
   `docs/modules/knowledge-base/prompts.md` chat block example to use
   `kb.searchEntries` (decision D1 from sprint 00).

## Out of scope

- API route handlers (sprint 02).
- `EmbeddingPipeline`, `SearchEngine`, version manager, bulk processor
  (sprint 02 + sprint 03).
- Pgvector migration + embedding column (sprint 02).
- Rate limiting (sprint 03).
- Dashboard UI (sprint 04).
- Registering the module in `apps/dashboard/src/lib/modules.ts` (sprint 04).
- Seed data for default categories and permissions (sprint 02).

## Deliverables

### File: `packages/module-knowledge-base/package.json`

```json
{
  "name": "@oven/module-knowledge-base",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema.ts",
    "./types": "./src/types.ts",
    "./api/*": "./src/api/*",
    "./engine/*": "./src/engine/*"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@oven/module-registry": "workspace:*",
    "@oven/module-config": "workspace:*",
    "@oven/module-tenants": "workspace:*",
    "@oven/module-subscriptions": "workspace:*",
    "drizzle-orm": "^0.38.0",
    "@neondatabase/serverless": "^0.10.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  },
  "peerDependencies": {
    "next": ">=15.0.0",
    "react": ">=19.0.0"
  }
}
```

**Rationale**:
- Mirrors `packages/module-ai/package.json` and
  `packages/module-subscriptions/package.json`.
- Depends on `module-subscriptions` only for the usage-metering service
  import in sprint 02. Not a cross-module import of business logic —
  `usageMeteringService` is the module's declared public surface.
- NO dependency on `@oven/module-ai`. KB calls the AI module only via
  HTTP (`POST /api/ai/embed`). Type-only imports from module-ai are
  forbidden to keep phases decoupled.

### File: `packages/module-knowledge-base/tsconfig.json`

Identical to `packages/module-subscriptions/tsconfig.json`.

### File: `packages/module-knowledge-base/vitest.config.ts`

Identical to `packages/module-ai/vitest.config.ts` (node environment,
include `src/**/*.test.ts`).

### File: `packages/module-knowledge-base/src/schema.ts`

Defines three tables per `docs/modules/knowledge-base/database.md`.
Column-level constraints match the canonical doc with the following
deviations:

1. **No `embedding` column in sprint 01**. The `vector()` column is added
   in sprint 02 via a Drizzle migration once pgvector is confirmed.
2. Add `embeddingStatus` varchar(16) column
   (`'pending' | 'processing' | 'ready' | 'failed'`) for async pipeline
   tracking. Default `'pending'`.
3. Add `embeddingError` text column for failure diagnostics.

All indexes from the canonical database.md are included. All FKs are
plain `integer()` per Rule 4.3.

### File: `packages/module-knowledge-base/src/types.ts`

Exports:
- `KbCategory`, `KbCategoryInsert` (inferred from schema).
- `KbEntry`, `KbEntryInsert`.
- `KbEntryVersion`, `KbEntryVersionInsert`.
- `SearchRequest` = `{ query: string; maxResults?: number; language?: string }`.
- `SearchResult` = `{ id: number; question: string; answer: string;
  categorySlug: string; score: number; matchType: 'semantic' | 'keyword' | 'hybrid' }`.
- `SearchResponse` = `{ results: SearchResult[]; totalResults: number;
  confidenceThreshold: number; topResultConfident: boolean }`.
- `EmbeddingStatus` = `'pending' | 'processing' | 'ready' | 'failed'`.

### File: `packages/module-knowledge-base/src/seed.ts`

```typescript
export async function seedKnowledgeBase(db: unknown): Promise<void> {
  // Sprint 01: no-op. Permissions + default categories arrive in sprint 02.
  // Kept as an exported function so the ModuleDefinition can reference it
  // without conditional wiring.
}
```

### File: `packages/module-knowledge-base/src/index.ts`

- `name: 'knowledge-base'`
- `dependencies: ['config', 'tenants', 'subscriptions']` (NOT `'ai'`
  because per Rule 3.1 we do not `import` from module-ai; we call its
  HTTP endpoints only).
- `description`: from canonical `Readme.md` §1.
- `capabilities`: from canonical `prompts.md` chat block.
- `schema`: `kbSchema` from `./schema`.
- `seed`: `seedKnowledgeBase` from `./seed`.
- `resources: []` (populated in sprint 04).
- `menuItems: []` (populated in sprint 04).
- `apiHandlers: {}` (populated in sprint 02 + sprint 03).
- `configSchema`: six entries per canonical `prompts.md` §Config Schema.
- `events`: `emits` listed per canonical `prompts.md` §Events. `schemas`
  matches Rule 2.3 typed format.
- `chat.actionSchemas`: contains `kb.searchEntries`, `kb.listEntries`,
  `kb.getEntry` with endpoints marked as "coming in sprint 02/03" in a
  code comment. Name, description, parameters, returns, and
  `requiredPermissions` are final.

### File: `packages/module-knowledge-base/src/__tests__/module-definition.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { knowledgeBaseModule } from '../index';

describe('knowledgeBaseModule', () => {
  it('uses the canonical module name', () => {
    expect(knowledgeBaseModule.name).toBe('knowledge-base');
  });

  it('declares dependencies without importing module-ai', () => {
    expect(knowledgeBaseModule.dependencies).toEqual(
      expect.arrayContaining(['config', 'tenants', 'subscriptions']),
    );
    expect(knowledgeBaseModule.dependencies).not.toContain('ai');
  });

  it('exposes the three canonical tables', () => {
    const schema = knowledgeBaseModule.schema as Record<string, unknown>;
    expect(schema.kbCategories).toBeDefined();
    expect(schema.kbEntries).toBeDefined();
    expect(schema.kbEntryVersions).toBeDefined();
  });

  it('emits the canonical event list', () => {
    expect(knowledgeBaseModule.events?.emits).toEqual(
      expect.arrayContaining([
        'kb.category.created',
        'kb.category.updated',
        'kb.category.deleted',
        'kb.entry.created',
        'kb.entry.updated',
        'kb.entry.deleted',
        'kb.entry.embedded',
        'kb.search.executed',
      ]),
    );
  });

  it('includes tenantId in every tenant-scoped event schema', () => {
    const schemas = knowledgeBaseModule.events?.schemas ?? {};
    for (const name of Object.keys(schemas)) {
      expect(schemas[name].tenantId?.required).toBe(true);
    }
  });

  it('uses kb.searchEntries (not kb.search) as the canonical tool name', () => {
    const names = knowledgeBaseModule.chat?.actionSchemas.map((s) => s.name) ?? [];
    expect(names).toContain('kb.searchEntries');
    expect(names).not.toContain('kb.search');
  });
});
```

### Doc updates

- `docs/modules/knowledge-base/api.md` — rename every `kb.search`
  reference in the MCP / chat section to `kb.searchEntries`. Leave the
  HTTP route `POST /api/knowledge-base/[tenantSlug]/search` unchanged —
  only the tool name changes.
- `docs/modules/knowledge-base/prompts.md` — update the chat block
  example and the tool list to use `kb.searchEntries`.
- `docs/modules/crosscheck-report.md` §4.6 — add a note recording the
  resolution ("Resolved 2026-04-xx via sprint 01 of module-knowledge-base").

## Acceptance criteria

- [ ] `pnpm install` succeeds and creates the workspace link.
- [ ] `pnpm turbo run lint typecheck --filter=@oven/module-knowledge-base`
      exits 0.
- [ ] `pnpm --filter @oven/module-knowledge-base test` runs the module
      definition test suite and exits 0.
- [ ] The package is NOT yet registered in
      `apps/dashboard/src/lib/modules.ts` (deliberately deferred).
- [ ] The three canonical doc updates are committed in the same PR.
- [ ] No cross-module imports from `@oven/module-ai`. Confirmed by
      grepping the package source.
- [ ] The sprint 01 test suite imports only from `vitest` and from the
      package's own source.

## Dependencies

- `@oven/module-registry` must export the `ModuleDefinition` and
  `EventSchemaMap` types (it already does).
- `@oven/module-subscriptions` must be buildable (it is).
- `@oven/module-tenants` and `@oven/module-config` must be buildable
  (they are).

## Risks

- **Risk**: vitest version mismatch across packages. **Mitigation**: reuse
  the exact version string from `packages/module-ai/package.json`.
- **Risk**: `ModuleDefinition` type does not export `configSchema` or
  `events.schemas` in the expected shape. **Mitigation**: read
  `packages/module-registry/src/types.ts` before writing `src/index.ts`
  and match the exact type.
- **Risk**: the `zod` dependency is unused in sprint 01. **Mitigation**:
  acceptable — it is declared for sprint 02 which uses zod for search
  request validation. Alternatively defer adding it to sprint 02's
  package.json update.

## Test plan

1. Create the package with the skeleton above.
2. Run `pnpm install` from repo root.
3. Run `pnpm --filter @oven/module-knowledge-base typecheck` — expect
   pass.
4. Run `pnpm --filter @oven/module-knowledge-base test` — expect the
   six assertions above to pass.
5. Run
   `pnpm turbo run lint --filter=@oven/module-knowledge-base` — expect
   pass.
6. Open `apps/dashboard` dev server — expect no regression because the
   module is NOT registered.
