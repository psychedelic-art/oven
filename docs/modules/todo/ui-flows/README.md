# Todo: module-ui-flows

Dynamic tenant-facing page portals with routing, theming, and analytics.
Each tenant gets a branded multi-page portal on a subdomain (or a custom
domain) that is fetched from the API and rendered dynamically.

## Sources of truth

- Top-level spec: `docs/modules/19-ui-flows.md` (722 lines, authoritative
  for data model, API, editor, events, ModuleDefinition, seeds).
- Portal app architecture: `docs/apps-portal.md` (subdomain routing,
  catch-all route, theme injection, analytics).
- Package source: `packages/module-ui-flows/` (schema, 11 handlers,
  seed, slug utils, types, ModuleDefinition).
- Editor source: `packages/ui-flows-editor/` (ReactFlow canvas + nodes
  + panels + store).
- Dashboard components: `apps/dashboard/src/components/ui-flows/*` plus
  `apps/dashboard/src/components/ui-flow-analytics/*`.
- Dashboard API routes: `apps/dashboard/src/app/api/ui-flows/**` and
  `apps/dashboard/src/app/api/portal/[tenantSlug]/**`.
- Temporary portal host: `apps/dashboard/src/app/portal/[tenantSlug]/[[...slug]]/page.tsx`
  (to be moved to a dedicated `apps/portal` Next.js app in sprint-02).

## Why it is in the queue

`ui-flows` has the most implementation of any not-yet-graduated module
and is the natural P1 graduation target after the five Phase 1..5
modules (ai, knowledge-base, agent-core, chat, workflow-agents) that
already live in canonical doc folders. It is also the dental project's
user-facing entry point: every tenant website is a UI flow, so the
blast radius of any regression here is tenant-visible.

## Status

See `STATUS.md`.

## Sprints

- `sprint-00-discovery.md` — research, canonical doc graduation
- `sprint-01-foundation.md` — unit tests, lint compliance, CI wiring
- `sprint-02-portal-app.md` — carve out `apps/portal` as a dedicated
  Next.js 15 app
- `sprint-03-editor-hardening.md` — validation, diff preview, version
  restore flow hardening in `ui-flows-editor`
- `sprint-99-acceptance.md` — graduation criteria and move to
  `docs/modules/ui-flows/`

## Dependencies

Per `packages/module-ui-flows/src/index.ts::uiFlowsModule.dependencies`:
`forms`, `tenants`. Additional runtime touch-points: `files` (hero and
logo assets), `knowledge-base` (FAQ page renderer), `chat` +
`agent-core` (chat page widget), `roles` (permission seeds),
`workflows` + `notifications` (optional triggers on form submit).

## Rule compliance anchors

Any code or doc change in this module must hold against:

- `docs/module-rules.md`
- `docs/package-composition.md`
- `docs/routes.md`
- `docs/use-cases.md`
- `docs/modules/00-overview.md`
- `docs/modules/13-tenants.md`
- `docs/modules/17-auth.md`
- `docs/modules/20-module-config.md`
- `docs/modules/21-module-subscriptions.md`
- Root `CLAUDE.md` (MUI `sx`, Tailwind `cn()`, `import type`,
  zustand factory + context, no inline `style={}`).
