# sprint-00-discovery — ui-flows

## Goal

Lock the ground truth for `module-ui-flows` before any code change:
graduate the canonical doc folder under `docs/modules/ui-flows/`, land
a senior `CODE-REVIEW.md`, and catalogue every cross-cutting rule that
subsequent sprints must respect.

## Scope

- Inventory every file under `packages/module-ui-flows/` and
  `packages/ui-flows-editor/`.
- Inventory every dashboard component and route related to `ui-flows`.
- Scaffold the canonical 11-file doc folder
  (`docs/modules/ui-flows/{Readme,UI,api,architecture,database,detailed-requirements,module-design,prompts,references,secure,use-case-compliance}.md`)
  with real content derived from the existing spec + code — no
  placeholders.
- Produce `CODE-REVIEW.md` in this folder capturing rule compliance
  and any style violations discovered.

## Out of scope

- Any code changes.
- Any test additions (sprint-01).
- Creating `apps/portal` (sprint-02).
- Editor hardening (sprint-03).

## Deliverables

1. `docs/modules/ui-flows/Readme.md` — module overview, status, links.
2. `docs/modules/ui-flows/UI.md` — dashboard resources, editor
   components, FTUE, microinteractions, portal page renderers.
3. `docs/modules/ui-flows/api.md` — every route, method, auth scope,
   request/response shape, and MCP `chat.actionSchemas` definitions.
4. `docs/modules/ui-flows/architecture.md` — layered view
   (DB → handlers → ModuleDefinition → dashboard → editor → portal
   runtime), subdomain resolution flow, theme propagation, analytics
   pipeline.
5. `docs/modules/ui-flows/database.md` — the 4 tables, FK discipline,
   RLS considerations, indexes, version snapshot strategy.
6. `docs/modules/ui-flows/detailed-requirements.md` — enumerated
   requirement list traceable to use-cases.md and dental project tasks.
7. `docs/modules/ui-flows/module-design.md` — ModuleDefinition export,
   resources, custom routes, menu items, config schema, events,
   dependencies, seed data.
8. `docs/modules/ui-flows/prompts.md` — the long-running execution
   prompt for this module (mirrors the shape used by `ai/prompts.md`
   and `knowledge-base/prompts.md`).
9. `docs/modules/ui-flows/references.md` — external research, prior art
   (ReactFlow, Vercel multi-tenant, Next.js middleware subdomain
   patterns), with URLs.
10. `docs/modules/ui-flows/secure.md` — OWASP coverage, tenant
    isolation, RLS, public endpoint hardening, custom CSS injection
    risk, custom domain verification.
11. `docs/modules/ui-flows/use-case-compliance.md` — mapping to
    `docs/use-cases.md` admin use-cases and `docs/dental-project.md`
    user stories.
12. `docs/modules/todo/ui-flows/CODE-REVIEW.md` — senior review of the
    existing `module-ui-flows` + `ui-flows-editor` surface.

## Acceptance criteria

- [x] Canonical doc folder exists with all 11 files and no placeholders.
- [x] Every file matches the tone + section layout of a graduated
      sibling (`docs/modules/knowledge-base/*`).
- [ ] `CODE-REVIEW.md` landed with a "Rule Compliance" section citing
      each ground-truth rule file (pending follow-up session).
- [ ] `docs/modules/IMPLEMENTATION-STATUS.md` updated to list ui-flows
      as "in graduation" (pending follow-up session; file does not
      exist at audit time).

## Dependencies

None — this is a documentation-only sprint.

## Risks

| Risk                                                        | Mitigation                                                             |
|-------------------------------------------------------------|-------------------------------------------------------------------------|
| Doc drift between spec `19-ui-flows.md` and reality         | Compare every section against `packages/module-ui-flows/src/*`          |
| Canonical folder shape mismatch                             | Mirror `docs/modules/knowledge-base/` file list exactly                 |
| Hidden features in dashboard components not in spec         | Read every `apps/dashboard/src/components/ui-flows/*` file before docs  |

## Test plan

No tests this sprint; sprint-01 owns the TDD surface.

## Rule compliance checklist

- [x] `docs/module-rules.md` — doc changes only, no rule-violating edits.
- [x] `docs/package-composition.md` — no package moves.
- [x] `docs/routes.md` — api doc reflects canonical routes.
- [x] `docs/use-cases.md` — `use-case-compliance.md` maps to it.
- [x] `docs/modules/00-overview.md` — module fits the overview layering.
- [x] `docs/modules/13-tenants.md` — `secure.md` + `database.md` cover
      tenant isolation.
- [x] `docs/modules/17-auth.md` — public routes flagged in api doc.
- [x] `docs/modules/20-module-config.md` — configSchema documented.
- [x] `docs/modules/21-module-subscriptions.md` — usage metering note
      in `architecture.md` (analytics volume only; no AI spend).
- [x] Root `CLAUDE.md` — no inline `style={}` introduced; no code
      changes.
