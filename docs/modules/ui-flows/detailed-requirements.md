# UI Flows -- Detailed Requirements

Every requirement below is numbered and traced to `docs/use-cases.md`, `docs/dental-project.md`, or the top-level spec `docs/modules/19-ui-flows.md`. Acceptance criteria are phrased so that `sprint-01-foundation.md` tests can assert them directly.

## 1. Core portal CRUD

**R-1.1** A tenant admin with `ui-flows.create` permission can create a UI flow by providing `name`, `slug`, and `tenantId`. The server inserts a row in `ui_flows` with `status='draft'`, `version=1`, and a default empty `definition`.
*Acceptance*: `POST /api/ui-flows` returns 201 with the created row; database row exists with expected defaults; `ui-flows.flow.created` event emitted.

**R-1.2** A tenant admin with `ui-flows.read` permission can list UI flows scoped to their tenant. Platform admins can list across tenants.
*Acceptance*: `GET /api/ui-flows` returns only rows where `tenantId` matches the caller's `x-tenant-id`; an admin without that header sees all rows.

**R-1.3** A tenant admin with `ui-flows.update` permission can update the `definition`, `themeConfig`, `domainConfig`, `description`, or `name` of a flow.
*Acceptance*: `PUT /api/ui-flows/[id]` updates the row, rebuilds `ui_flow_pages` from `definition.pages[]` in the same transaction, and emits `ui-flows.flow.updated`.

**R-1.4** A tenant admin with `ui-flows.delete` permission can archive a flow. The row is not hard-deleted; `status` is set to `archived` and `enabled=false`.
*Acceptance*: `DELETE /api/ui-flows/[id]` returns 204; the row remains in the database with `status='archived'`; `ui_flow_versions` rows are retained.

## 2. Definition structure

**R-2.1** A UI flow definition MUST contain at least one page. The editor's validation must reject a definition with `pages.length === 0`.
*Acceptance*: `validation.ts` returns `{ valid: false, errors: [{ field: 'pages', message: '...' }] }` for an empty pages array.

**R-2.2** Page slugs within a single definition MUST be unique.
*Acceptance*: `validation.ts` returns `{ valid: false }` for duplicate slugs; the `PUT` handler also rejects with 400.

**R-2.3** Each page MUST declare a `type` from `{ form, faq, landing, chat, custom }`. `form` and `custom` types MUST reference a valid `formRef`. `chat` type MUST include an `agentSlug` in `config`.
*Acceptance*: validation enforces these constraints with distinct error messages per missing field.

**R-2.4** `MAX_PAGES_PER_FLOW` from `configSchema` is a hard cap. The editor visibly blocks adding page N+1 and the server returns 400 on PUT.
*Acceptance*: with `MAX_PAGES_PER_FLOW=3`, attempting to save 4 pages yields 400 with `{ error: 'Too many pages', limit: 3 }`.

## 3. Versioning and publishing

**R-3.1** A publish action inserts a new immutable row into `ui_flow_versions` with `version = current.version + 1`, then updates `ui_flows` to `status='published'`, `version=new`.
*Acceptance*: `POST /api/ui-flows/[id]/publish` increments both the version column and inserts a version row; `ui-flows.flow.published` event emitted.

**R-3.2** The version history endpoint returns all versions ordered by `version DESC`.
*Acceptance*: `GET /api/ui-flows/[id]/versions` returns the expected order; each row contains `definition`, `themeConfig`, `description`, `createdAt`.

**R-3.3** A restore action copies `definition` and `themeConfig` from a target version back into `ui_flows`, bumps the version, and inserts a new version snapshot with a description like `Restored from version N`.
*Acceptance*: `POST /api/ui-flows/[id]/versions/[versionId]/restore` returns 200 with the new version number; a new row exists in `ui_flow_versions`; `ui-flows.flow.updated` emitted.

**R-3.4** Publishing an invalid definition (fails validation) is blocked at the server; the editor also blocks at the toolbar.
*Acceptance*: `POST /api/ui-flows/[id]/publish` returns 400 if validation fails.

## 4. Public portal resolution

**R-4.1** The public `GET /api/portal/[tenantSlug]` endpoint returns the single `published` + `enabled=true` UI flow for the given tenant, or 404.
*Acceptance*: seeded tenant with one published flow returns 200 with `{ definition, theme, domain, tenantName, version }`; same endpoint for an unknown slug returns 404.

**R-4.2** The portal resolve response is cached with Next.js ISR keyed by `(tenantSlug, version)`. On publish, the cache is invalidated via `revalidateTag('flow:{id}:{version}')`.
*Acceptance*: within 2 seconds of a publish the next request returns the new version without manual cache bust.

**R-4.3** All public endpoints are declared in `api_endpoint_permissions` with `is_public=true` and require no session.
*Acceptance*: `portal/[tenantSlug]` responds 200 without a session; `ui-flows/[id]` responds 401 without a session.

## 5. Analytics

**R-5.1** The public analytics recorder accepts `page_view`, `form_submit`, `chat_start`, and `cta_click` event types. Unknown event types are rejected with 400.
*Acceptance*: POST with valid event types returns 200 and inserts a row; POST with `eventType='bogus'` returns 400.

**R-5.2** Each `page_view` event emits `ui-flows.page.visited`; each `form_submit` event emits `ui-flows.form.submitted`.
*Acceptance*: handler test asserts the events are emitted with correct payloads.

**R-5.3** Analytics endpoint is rate limited to 60 requests per minute per `visitorId`.
*Acceptance*: request 61 within 60s returns 429.

**R-5.4** The dashboard analytics list supports filters for `dateFrom`, `dateTo`, `pageSlug`, `eventType`, and `uiFlowId`.
*Acceptance*: `GET /api/ui-flow-analytics?dateFrom=...&eventType=form_submit` returns only matching rows.

**R-5.5** A cron job prunes `ui_flow_analytics` rows older than `ANALYTICS_RETENTION_DAYS` (default 90) on a per-tenant basis. Scheduled in `sprint-03-editor-hardening.md` deliverables.
*Acceptance*: running the pruner twice with a 91-day cutoff deletes the expected rows and leaves the rest.

## 6. Theming

**R-6.1** Each UI flow has a `themeConfig` containing `primaryColor`, `secondaryColor`, `backgroundColor`, `surfaceColor`, `textColor`, `fontFamily`, `headingFontFamily`, `logoUrl`, `faviconUrl`, `borderRadius`, `maxContentWidth`, and optional `customCss`.
*Acceptance*: the theme panel surfaces every field; the portal layout applies each value as a CSS custom property.

**R-6.2** `themeConfig.customCss` is only injected when `ENABLE_CUSTOM_CSS=true` for the tenant. Otherwise the field is ignored on render.
*Acceptance*: with the flag off, `customCss` content does not appear in the rendered HTML.

**R-6.3** Logo and favicon URLs must resolve to files managed by `module-files` or a whitelisted CDN. Arbitrary URLs are blocked by the theme validator.
*Acceptance*: the theme panel's image picker only accepts files URLs; the server rejects theme config with non-whitelisted URLs on PUT.

## 7. Custom domains

**R-7.1** A tenant admin can register a custom domain via `domainConfig.customDomain`. The platform validates ownership via a TXT record before flipping `customDomainVerified=true`.
*Acceptance*: the ownership check runs on a scheduled job; flipping the verified flag requires the TXT match.

**R-7.2** `ENABLE_CUSTOM_DOMAINS=false` disables the whole flow platform-wide.
*Acceptance*: with the flag off, the domain panel is hidden and server requests to register a custom domain return 403.

## 8. Editor

**R-8.1** The editor renders the definition as a ReactFlow canvas with a node per page, plus nodes for navigation, theme, and footer.
*Acceptance*: opening a seeded flow shows N+3 nodes (N pages + navigation + theme + footer).

**R-8.2** The editor persists the editor state (zoom, pan, selection) in a zustand store created via a factory function and injected through a React context per root `CLAUDE.md`. Two editor instances on the same page do not share state.
*Acceptance*: rendering two providers with different `uiFlowId` shows independent state.

**R-8.3** The publish button blocks publish if validation returns errors. Clicking it opens a dialog listing every validation error with a link to the offending node.
*Acceptance*: test with an invalid definition asserts the dialog content.

## 9. Dashboard UI

**R-9.1** `UiFlowList` uses a React Admin datagrid with columns: tenant, name, slug, status, version, enabled, updatedAt. Status uses a color-coded chip.
*Acceptance*: snapshot test covers every column.

**R-9.2** `UiFlowEdit` contains a toolbar button that opens the visual editor via the custom route `/ui-flows/[id]/editor`.
*Acceptance*: clicking the button navigates to the editor page.

**R-9.3** `UiFlowShow` displays a version history tab with one row per `ui_flow_versions` entry and a "Restore" action.
*Acceptance*: snapshot test covers the tab; restore triggers the restore endpoint.

## 10. Rule compliance

**R-10.1** All dashboard components use MUI `sx`. No inline `style={{ }}`. No `styled(Component)`.
*Acceptance*: `grep -R "style={" apps/dashboard/src/components/ui-flows` returns no matches.

**R-10.2** All portal components (in `apps/portal` once it exists) use Tailwind `cn()` from `@oven/oven-ui`. The only exception is the `style` prop applied to `<style>` elements injecting CSS custom properties from the theme config at runtime.
*Acceptance*: `grep -R "style={" apps/portal/src` returns only matches inside the CSS variable injection block.

**R-10.3** Every type-only import uses `import type`.
*Acceptance*: `eslint --rule '@typescript-eslint/consistent-type-imports: error'` passes on both packages.

**R-10.4** The zustand store in `ui-flows-editor` is never a singleton. It is created via a factory inside a React context provider.
*Acceptance*: `grep "create(" packages/ui-flows-editor/src/store` matches `createStore` from `zustand/vanilla` only; no module-level `useStore` calls exist.
