# Business Owner — Psychedelic Claude Code → OVEN Migration

## Role

The **Business Owner (BO)** is the single point of accountability for this
project. The BO does not write code. The BO:

1. **Defines value**: which subsystems of `psychedelic-art/claude-code`
   actually move the needle for OVEN, and which are vanity ports.
2. **Proposes integrations**: how each subsystem plugs into existing OVEN
   modules without breaking `docs/module-rules.md`.
3. **Resolves ambiguity**: when an async run hits a fork in the road, the
   agent appends a question to the **Open questions** section below and
   stops the sprint. The BO answers, then the next run resumes.
4. **Signs off**: each sprint has a checkbox in `STATUS.md`. The project
   is only DONE when the BO checks the box in § Sign-off below.

## Integration proposals (initial)

These are the BO's opening proposals. The agent should treat them as
defaults and only deviate with a recorded reason.

### IP-1 — Tools live in a new `module-claude-code`, not in `module-agent-core`

**Why**: `module-agent-core` is the orchestration brain (planning, loops,
guardrails). The 40+ Claude Code tools (Read, Write, Edit, Bash, Grep,
Glob, WebFetch, …) are *capabilities*, not orchestration. Putting them in
their own module keeps `module-agent-core` slim and lets tenants disable
the entire tool surface in one toggle.

### IP-2 — Slash commands are workflows, not code

**Why**: OVEN already has `module-workflows` with versioning, a visual
editor, and triggers. Re-implementing a parallel command runtime would
violate Rule 3 (Pluggable) and Rule 4 (Loosely Coupled). Every slash
command becomes a seeded workflow definition with a `triggerEvent` of
`claude-code.command.invoked`.

### IP-3 — Skills are a JSONB-first entity in a new `module-skills`

**Why**: Skills evolve quickly and are user-authored. Rule 7 (JSON-First
Definitions) and Rule 7.2 (versioning via snapshot tables) apply
directly. They get their own module so they can be removed without
breaking the tool catalog.

### IP-4 — Memory uses `module-knowledge-base`, not a parallel store

**Why**: `module-knowledge-base` already does embeddings, RLS, and
tenant-scoping. The Claude Code `memdir/` becomes a *namespace* inside
the knowledge base (`namespace = 'agent-memory'`), not a new table.

### IP-5 — MCP and plugins are adapter packages

**Why**: Rule 3.3 (Adapter pattern). MCP servers and plugins are external
integrations. Each MCP server is a separate `mcp-<name>` package; each
plugin is a separate `plugin-<name>` package. The module never imports
adapter packages directly; `apps/dashboard/src/lib/modules.ts` wires
them in.

### IP-6 — No terminal UI

**Why**: OVEN's surface is the React Admin dashboard and the Unity
client. Ink components are a dead-end. The BO accepts losing the
terminal UX in exchange for a tenant-aware, RBAC-protected dashboard
console.

### IP-7 — No Bun

**Why**: The monorepo is pnpm + Node 20. Re-introducing Bun would
fragment the build pipeline. All Bun-specific code paths
(`Bun.spawn`, `Bun.file`, dead-code-elimination feature flags) are
re-implemented with Node equivalents during Sprint 01.

### IP-8 — Multi-tenant from day one

**Why**: Rule 5 (Tenant-Scoped). Every new table gets a `tenantId`
column with an index. Every API handler filters by tenant. The Run
Console picks the active tenant from the existing `TenantSelector`.

### IP-9 — Defer voice, vim, and IDE bridges

**Why**: They have low ROI for the initial integration and high
maintenance cost. They are explicitly listed in **Out of scope** in
Sprint 00.

## Open questions

> The async runner will append questions here when it hits ambiguity.
> Format: `### Q-NNN — <one-line title>` followed by context, options,
> and a `**BO answer:**` line that the BO fills in.

_(none yet)_

## Sign-off

- [ ] Sprint 00 — Discovery & ADRs
- [ ] Sprint 01 — Foundation
- [ ] Sprint 02 — Tools
- [ ] Sprint 03 — Commands
- [ ] Sprint 04 — Agent loop
- [ ] Sprint 05 — Skills
- [ ] Sprint 06 — Memory
- [ ] Sprint 07 — MCP
- [ ] Sprint 08 — Plugins
- [ ] Sprint 09 — Auth & RLS
- [ ] Sprint 10 — Dashboard UI
- [ ] Sprint 11 — Events, telemetry, acceptance
- [ ] **Project DONE** — BO signature: `__________________`  Date: `__________`
