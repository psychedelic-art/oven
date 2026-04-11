# Todo: `module-knowledge-base`

> FAQ-first knowledge management module with tenant-isolated categories,
> question-answer entries, embedding pipeline, and hybrid semantic + keyword
> search. Phase 2 of the crosscheck-report implementation plan.

---

## Identity

- **Package**: `packages/module-knowledge-base/` *(to be created — sprint 01)*
- **Name**: `@oven/module-knowledge-base`
- **Dependencies**: `module-registry`, `module-ai`, `module-tenants`
- **Depended on by**: `module-agent-core` (kb.searchEntries tool),
  `module-chat` (FAQ answers), `module-workflow-agents` (`agent.rag` node)
- **Phase**: 2 of 5 (see `docs/modules/crosscheck-report.md`)
- **Status**: Docs-only → Todo. Canonical docs already exist at
  `docs/modules/knowledge-base/`; only the package + tests + registration
  remain.

---

## Why this module, why now

- **Ground truth**: `docs/modules/crosscheck-report.md` lists KB as Phase 2
  and states that agent-core, chat, and workflow-agents all block on it.
- **FAQ-first architecture**: the dental assistant and every downstream
  agent use FAQ-first routing (search KB → fall back to LLM only on
  low-confidence). Without KB, every agent call pays LLM cost.
- **Use cases**: covers dental FAQ entries in Spanish, scheduling Q&A,
  pricing Q&A, and service descriptions — all of which must exist before
  the dental-project `09-dashboards` can show meaningful metrics.

---

## Canonical doc set (already present)

The canonical doc shape under `docs/modules/knowledge-base/` is **already
complete** — no scaffold work required:

- `Readme.md`
- `UI.md`
- `api.md`
- `architecture.md`
- `database.md`
- `detailed-requirements.md`
- `module-design.md`
- `prompts.md`
- `references.md`
- `secure.md`
- `use-case-compliance.md`

This todo folder therefore only hosts sprint files, status, and the
execution prompt.

---

## Sprint index

| # | File | Goal | Gate |
|:-:|------|------|------|
| 00 | [`sprint-00-discovery.md`](./sprint-00-discovery.md) | Research, decisions, open questions, rule-compliance baseline | No code |
| 01 | [`sprint-01-foundation.md`](./sprint-01-foundation.md) | Create package, schema, types, seed, ModuleDefinition with no business logic | Package builds, typechecks, lints |
| 02 | [`sprint-02-embedding-pipeline.md`](./sprint-02-embedding-pipeline.md) | `EmbeddingPipeline` + auto-embed on CRUD + version snapshots | Tests for embedding path pass |
| 03 | [`sprint-03-search-engine.md`](./sprint-03-search-engine.md) | `SearchEngine` hybrid semantic + keyword, public search endpoint, rate limiting | Search tests pass, public endpoint responds |
| 04 | [`sprint-04-dashboard-ui.md`](./sprint-04-dashboard-ui.md) | React Admin CRUD + KBSearchTest + KBBulkActions + menu section | UI flows work end-to-end in browser |
| 05 | [`sprint-05-acceptance.md`](./sprint-05-acceptance.md) | Module rules checklist, graduation to `docs/modules/knowledge-base/` | All 20 checklist items pass |

---

## Ground-truth files bound by this module

Any code or doc change in this folder must conform to:

- `docs/module-rules.md` — every rule, especially 1 (ModuleDefinition), 4
  (loose coupling / plain int FKs), 5 (tenantId + RLS), 10 (API design),
  11 (schema), 13 (config centralization).
- `docs/modules/00-overview.md`, `docs/modules/20-module-config.md`,
  `docs/modules/21-module-subscriptions.md` — cascade, quotas, metering.
- `docs/modules/13-tenants.md`, `docs/modules/17-auth.md` — tenant scoping
  and auth middleware.
- `docs/modules/18-knowledge-base.md` — binding top-level spec.
- The full canonical doc set under `docs/modules/knowledge-base/`.
- Root `CLAUDE.md` — MUI `sx`, Tailwind `cn()` from `@oven/oven-ui`,
  `import type`, zustand factory + context, no inline `style={}`.

Any conflict between this folder's sprint files and the files above is a
bug in the sprint file. Fix the sprint, not the ground truth.
