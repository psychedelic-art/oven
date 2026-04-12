# Module Files — STATUS

| Field | Value |
|---|---|
| Module | `files` |
| Package | `packages/module-files/` |
| Top-level spec | `docs/modules/14-files.md` (373 lines) |
| Canonical doc set | **complete (11/11)** — scaffolded cycle-4 |
| Current sprint | `sprint-03-tenant-scoping.md` **SHIPPED cycle-22** — 41/41 tests green; next is `sprint-04-dashboard-ui.md` |
| Sprint queue | 6 files (00 → 05-acceptance) |
| Active branch | `claude/inspiring-clarke-JuFO1` (cycle-4) |
| Backup branch | none yet — first feature work against this module ships cycle-4 |
| Test framework | vitest 3.2.4 (matches siblings) |
| QA verdict | n/a — awaiting sprint-01 merge |
| Blockers | none |

## Last updates

- **2026-04-11 (cycle-4 Phase 3)** — Canonical `docs/modules/files/`
  11-file shape scaffolded: `Readme.md`, `UI.md`, `api.md`,
  `architecture.md`, `database.md`, `detailed-requirements.md`,
  `module-design.md`, `prompts.md`, `references.md`, `secure.md`,
  `use-case-compliance.md`. Todo folder seeded with README +
  STATUS + 6 sprint files (00 → 05-acceptance).
- **2026-04-11 (cycle-4 Phase 4)** — `sprint-01-security-hardening`
  shipped: package-private `getOrderColumn` helper copied to
  `packages/module-files/src/api/_utils/sort.ts`, `GET /api/files`
  uses `ALLOWED_SORTS` + `getOrderColumn`, 8 vitest tests in
  `src/__tests__/sort-guard.test.ts`, `vitest.config.ts` added.

## Implementation status snapshot (on `dev`)

- **Schema**: `files` table + 5 indexes — LIVE.
- **Engine**: `processUpload`, `VercelBlobAdapter`, `LocalFsAdapter`,
  `getStorageAdapter` factory/singleton — LIVE.
- **Handlers**: 3 of 7 live
  (`files.handler.ts`, `files-by-id.handler.ts`,
  `files-upload.handler.ts`). Missing: PUT, download, public serve.
- **Seed**: `seedFiles` — 5 permissions via `ON CONFLICT DO NOTHING`.
- **ModuleDefinition**: `filesModule` with 2 configSchema entries,
  2 typed events, 3 chat action schemas.
- **Dashboard UI**: 0 components (spec §6 missing).
- **Tests**: 41 (sprint-01 sort guard + sprint-02 magic-bytes + upload-processor + sprint-03 handler tests — all green).

## Known gaps

| # | Gap | Severity | Sprint |
|---|---|---|---|
| 1 | ~~F-05-01 sort injection in `GET /api/files`~~ — **CLOSED sprint-01** | — | — |
| 2 | ~~MIME allowlist not enforced on upload~~ — **CLOSED sprint-02 (cycle-13)** | — | — |
| 3 | ~~Size limit not enforced on upload~~ — **CLOSED sprint-02 (cycle-13)** | — | — |
| 4 | ~~Magic-byte verification missing~~ — **CLOSED sprint-02 (cycle-13)** | — | — |
| 5 | `tenantId` from request body is not clamped against JWT tenant set | HIGH | BLOCKED on module-auth/ssr |
| 6 | ~~List/get/delete do not filter by tenant~~ — **CLOSED sprint-03 (cycle-22)** | — | — |
| 7 | ~~Upload processor not unit-testable~~ — **CLOSED sprint-02 (cycle-13)** adapter injection | — | — |
| 8 | `PUT /api/files/[id]` handler missing | MEDIUM | sprint-04 |
| 9 | Download + public-serve handlers missing | MEDIUM | sprint-05 |
| 10 | React Admin `FileList`/`FileShow` missing | MEDIUM | sprint-04 |
| 11 | `<FileUpload />`/`<FilePreview />`/`<FilePicker />` not exported | MEDIUM | sprint-04 |
| 12 | ~~`THUMBNAIL_MAX_SIZE`, `MAX_FILES_PER_TENANT` config keys~~ — **CLOSED sprint-03 (cycle-22)** | — | — |
| 13 | RLS policies planned but not applied | MEDIUM | blocked on `module-auth` |

## Acceptance checklist

Mirrors `sprint-05-acceptance.md`. Updated each sprint.

- [x] `GET /api/files` uses `getOrderColumn` + allowlist — 8 tests green (sprint-01)
- [x] `POST /api/files/upload` enforces `ALLOWED_MIME_TYPES` with magic-byte check (cycle-13)
- [x] `POST /api/files/upload` enforces `MAX_FILE_SIZE_MB` (cycle-13)
- [ ] `POST /api/files/upload` clamps `tenantId` against JWT tenant set (BLOCKED on module-auth/ssr)
- [x] `processUpload` accepts optional adapter parameter (cycle-13)
- [ ] `LocalFsAdapter` rejects keys containing `..`
- [ ] List/get/delete filter by tenant and return 404 on cross-tenant
- [ ] `PUT /api/files/[id]` handler shipped
- [ ] `files.file.updated` event emitted
- [ ] `<FileUpload />`, `<FilePreview />`, `<FilePicker />` exported
- [ ] `FileList` / `FileShow` React Admin resources registered
- [ ] `FileBrowserPage` custom route at `/files/browser`
- [ ] Every UI component uses `sx` only (no `style={{ }}`)
- [ ] `import type` for every type-only import in the package
- [ ] `pnpm --filter @oven/module-files test` green
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` lists files as live
