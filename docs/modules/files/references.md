# Files Module — References

> External and internal references consulted while scaffolding this
> canonical doc set. Every URL was checked against the OVEN stack
> (pnpm + Turborepo, Node 20+, React 19, Next 15, React Admin 5 +
> MUI 7, Tailwind + `@oven/oven-ui`) and the ground-truth rules.

## Stack-native primary references

- **Vercel Blob** — the default storage adapter.
  <https://vercel.com/docs/storage/vercel-blob>
  Relevant for: `put()` / `del()` semantics, content-disposition,
  rate limits, folder-prefix pathing.
- **Vercel Blob `@vercel/blob` package API reference.**
  <https://vercel.com/docs/storage/vercel-blob/using-blob-sdk>
  Consulted for `VercelBlobAdapter.upload/delete` semantics.
- **Next.js Route Handlers — file uploads.**
  <https://nextjs.org/docs/app/building-your-application/routing/route-handlers>
  The `Request`/`NextRequest` body is a `ReadableStream`; reference
  for future multipart implementation (spec §4 upload flow).
- **`sharp` image processing.** <https://sharp.pixelplumbing.com/>
  For `extractImageMeta` dimension extraction and the future
  thumbnail generation pipeline (spec §4 processing table).
- **Drizzle ORM — JSONB columns.**
  <https://orm.drizzle.team/docs/column-types/pg#jsonb>
  Used for the `metadata` column typing.
- **Drizzle ORM — indexes.**
  <https://orm.drizzle.team/docs/indexes-constraints>
  Used to plan the 5-index strategy on `files`.
- **React Admin 5 — list / show / filters / bulk actions.**
  <https://marmelab.com/react-admin/List.html>
  Reference for `FileList` design in `UI.md`.
- **MUI 7 `sx` prop API.**
  <https://mui.com/system/getting-started/the-sx-prop/>
  Per `CLAUDE.md` rule `mui-sx-prop`, all dashboard styling uses
  this.

## Security references

- **OWASP Top 10 — A04 Insecure Design.**
  <https://owasp.org/Top10/A04_2021-Insecure_Design/>
  Guides the "allowlist over deny-list" sprint-01 design.
- **OWASP File Upload Cheat Sheet.**
  <https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html>
  Primary reference for sprint-01 hardening checklist: MIME
  allowlist, magic-byte verification, size limits, filename
  sanitisation, path traversal prevention, content-sniffing
  mitigation.
- **OWASP MASVS — file handling on mobile clients.**
  <https://mas.owasp.org/MASVS/> (MSTG-STORAGE-2)
  Secondary reference for sensitive-file storage on the portal.
- **CWE-434 — Unrestricted Upload of File with Dangerous Type.**
  <https://cwe.mitre.org/data/definitions/434.html>
  The exact class of bug sprint-01 mitigates.
- **CWE-22 — Path Traversal.**
  <https://cwe.mitre.org/data/definitions/22.html>
  Why the storage key is server-generated and the local adapter
  path-sanitises.

## Internal OVEN references

- `docs/modules/14-files.md` — top-level spec (the contract).
- `docs/module-rules.md` — Rule 3.1 (no cross-module imports), Rule
  4.1 (event naming `<module>.<entity>.<action>`), Rule 4.3 (FK
  type consistency).
- `docs/package-composition.md` — package layering; `module-files`
  is Phase 0, below `module-tenants`.
- `docs/routes.md` — `/api/files/*` route registration rules.
- `docs/use-cases.md` — UC-Files cross-references in consumer
  modules (logos, chat attachments, etc.).
- `docs/modules/00-overview.md` — where the files module sits in
  the overall module graph.
- `docs/modules/13-tenants.md` — tenant-scoping contract that R1.9
  / R3.2 / R4.4 enforce.
- `docs/modules/17-auth.md` — the JWT tenant-set shape that
  sprint-2 will consume.
- `docs/modules/20-module-config.md` — the config cascade that R1.5
  / R1.6 read from (`files.MAX_FILE_SIZE_MB`,
  `files.ALLOWED_MIME_TYPES`).
- `docs/modules/todo/oven-bug-sprint/sprint-05-handler-typesafety.md`
  — F-05-01 / F-05-02 findings this module implements mitigations
  for.

## Reference implementations inside the monorepo

- **`packages/module-ai/src/api/_utils/sort.ts`** — the canonical
  `getOrderColumn<T>` helper. Sprint-01 copies this verbatim.
  Tested in `packages/module-ai/src/__tests__/ai-sort-guard.test.ts`
  (8 tests).
- **`packages/module-ai/src/api/ai-playground-executions.handler.ts`**
  — reference handler wiring (allowlist const + `getOrderColumn`
  call + `badRequest` branch + `orderFn` application). Copy this
  shape into `packages/module-files/src/api/files.handler.ts`.
- **`packages/module-tenants/src/__tests__/compute-business-hours.test.ts`**
  — reference for vitest test organisation in a module package.
- **`packages/module-tenants/vitest.config.ts`** — reference for
  the minimal vitest config (9 lines) to drop into
  `packages/module-files/`.
- **`packages/module-subscriptions/src/engine/resolve-effective-limit.ts`**
  — reference for the pure-helper + discriminated-union pattern we
  may adopt when the upload processor grows more validation
  branches.

## Explicitly rejected references

- **NPM `multer`** — Express-first, does not integrate with Next.js
  route handlers without a shim. Multipart upload (spec §4) will
  use `Request.formData()` natively instead.
- **NPM `formidable`** — same reason.
- **AWS SDK `@aws-sdk/client-s3`** — pulled in a >10 MB dependency
  graph. Not warranted until S3Adapter is a real requirement
  (sprint-5 optional).
- **`ClamAV` server process** — virus scanning is not in scope for
  OVEN's current customer list. Noted in `secure.md` as a deferred
  mitigation.
