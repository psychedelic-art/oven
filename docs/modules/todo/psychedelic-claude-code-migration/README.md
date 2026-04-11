# Project — Psychedelic Claude Code → OVEN Migration

> **Source repository**: https://github.com/psychedelic-art/claude-code
> **Target**: OVEN monorepo (`pnpm` + Turborepo, Next.js 15, React Admin 5,
> Drizzle + Neon, Unity client)
> **Working branch**: `feature/psychedelic-claude-code-migration`
> **Owner (BO)**: see `business-owner.md`
> **Status file**: `STATUS.md` (updated after every sprint run)

---

## 1. Why this project exists

The `psychedelic-art/claude-code` repository is the leaked, unobfuscated
TypeScript source of an agentic coding CLI: ~1,900 files, ~512k LOC,
~40 agent tools, ~85 slash commands, multi-agent coordinator, MCP server,
plugin system, skills system, persistent memory, IDE bridge, voice input,
Vim mode, OAuth/Keychain auth, OpenTelemetry.

OVEN already has `module-agent-core`, `module-ai`, `module-workflows`,
`module-workflow-agents`, `module-knowledge-base`, `agent-ui` and
`agent-workflow-editor` packages — but the agent stack is shallow compared
to what `psychedelic-art/claude-code` ships out of the box.

The goal of this project is **not** to fork a CLI into the monorepo. The
goal is to **extract every reusable subsystem** of that codebase and
integrate it as **proper OVEN modules** that obey `docs/module-rules.md`:

- Tools become discoverable `actionSchemas` exposed by a new
  `module-claude-code` (or by extending `module-agent-core`).
- Slash commands become seeded **workflow definitions** in
  `module-workflows`.
- The agent loop / coordinator integrates into `module-agent-core` and
  emits events on the OVEN `EventBus`.
- Skills become a JSONB-first, versioned entity in a new
  `module-skills` (Rule 7: JSON-First Definitions, Rule 11: Schema Design).
- MCP servers become an **adapter pattern** (Rule 3.3) registered at
  app startup from separate `mcp-<name>` packages.
- Plugins become an **adapter pattern** as well.
- Memory (`memdir/`) integrates with `module-knowledge-base` so it
  benefits from existing embeddings + RLS.
- The terminal UI (Ink) is **not migrated**; the dashboard React Admin
  resources + a custom "Run Console" editor in `apps/dashboard` replace it.
- The Bun runtime is **not migrated**; everything moves to Node 20+ with
  the existing Turbo build pipeline.

## 2. Non-goals

- No fork of the CLI binary.
- No Bun-specific code paths.
- No Ink UI in `packages/oven-ui` or the portal.
- No direct cross-module imports (Rule 3.1).
- No new tenant-customizable columns on domain tables (Rule 13.1).
- No bypassing the registry, EventBus, or config cascade.

## 3. High-level mapping

| psychedelic-art/claude-code subsystem | OVEN target | Sprint |
|---|---|---|
| `src/tools/` (~40 tools) | `packages/module-claude-code/src/tools/` + `actionSchemas` | 02 |
| `src/commands/` (~85 slash cmds) | Seeded workflows in `module-workflows` | 03 |
| `src/Tool.ts`, `src/Task.ts`, `src/QueryEngine.ts` | `module-agent-core` engine extensions | 04 |
| `src/coordinator/` | `module-agent-core` swarm runtime | 04 |
| `src/skills/` | New `packages/module-skills/` | 05 |
| `src/memory/`, `src/memdir/` | `module-knowledge-base` memory namespace | 06 |
| `src/services/mcp/`, `mcp-server/` | `module-claude-code` MCP **adapter** + `mcp-*` packages | 07 |
| `src/plugins/` | `module-claude-code` plugin **adapter** + `plugin-*` packages | 08 |
| `src/services/oauth/`, keychain | Reuse `auth-authjs` / `auth-firebase`; new `claude-code-credentials` table | 09 |
| `src/components/`, `src/screens/`, `src/ink/` | **Replaced** by React Admin resources + Run Console editor in `apps/dashboard` | 10 |
| `src/bridge/` (VS Code / JetBrains) | Out of scope (deferred to a follow-up project) | — |
| `src/voice/`, `src/vim/` | Out of scope (deferred) | — |
| `src/services/analytics/` (OpenTelemetry) | Hook into existing telemetry pipeline | 11 |
| `src/state/`, `src/context/` | Zustand factory store pattern (CLAUDE.md `zustand-store-pattern`) | 04 |
| `src/migrations/` | Drizzle migrations under each new module | 01 |

## 4. Sprint index

| # | File | Title | Goal in one line |
|---|------|-------|------------------|
| 00 | `sprint-00-discovery.md` | Discovery & ADRs | Inventory the source repo, write ADRs, freeze scope. |
| 01 | `sprint-01-foundation.md` | `module-claude-code` foundation | Create the package skeleton + ModuleDefinition + schema + seed. |
| 02 | `sprint-02-tools.md` | Tool catalog migration | Port the ~40 tools as discoverable `actionSchemas` + handlers. |
| 03 | `sprint-03-commands.md` | Slash commands → workflows | Map ~85 commands to seeded workflow definitions. |
| 04 | `sprint-04-agent-loop.md` | Agent loop & coordinator | Integrate QueryEngine, Task, multi-agent coordinator into `module-agent-core`. |
| 05 | `sprint-05-skills.md` | Skills module | Create `module-skills` (JSONB + versioning + execution). |
| 06 | `sprint-06-memory.md` | Memory & context compression | Integrate memdir into `module-knowledge-base`. |
| 07 | `sprint-07-mcp.md` | MCP adapter | MCP adapter + first `mcp-filesystem` package. |
| 08 | `sprint-08-plugins.md` | Plugin adapter | Plugin adapter + first sample plugin package. |
| 09 | `sprint-09-auth-rls.md` | Auth, permissions, RLS | Permissions seed, RLS policies, credential storage. |
| 10 | `sprint-10-ui.md` | Dashboard UI | React Admin resources + Run Console editor. |
| 11 | `sprint-11-events-acceptance.md` | Events, telemetry, acceptance | EventBus emissions, OpenTelemetry, end-to-end acceptance. |

Each sprint file is **self-contained** and follows the same template:
**Goal · Scope · Out of scope · Deliverables · Acceptance criteria ·
Touched packages · Risks · Rule references**.

## 5. How to run this project

See `PROMPT.md`. Copy it into a Claude Code session (or queue it as an
async run). The prompt:

- Locks the agent to branch `feature/psychedelic-claude-code-migration`.
- Forces it to read `CLAUDE.md`, `docs/module-rules.md`, and the
  relevant `docs/modules/*.md` files before touching any code.
- Forces it to update `STATUS.md` and commit with `[sprint-NN] …`
  before moving on.
- Forces a hard stop after each sprint so the BO can review.

## 6. Definition of Done (whole project)

- All sprints 00–11 marked **DONE** in `STATUS.md`.
- `pnpm -w turbo run lint typecheck build test` is green.
- `apps/dashboard` boots, the new modules appear in the sidebar with a
  "Claude Code" section, and the Run Console can execute a tool against
  a tenant-scoped session.
- `docs/modules/` contains a `22-claude-code.md` reference doc.
- BO has signed off in `business-owner.md` § Sign-off.
