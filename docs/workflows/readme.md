# Workflow Engine

> Multi-step workflow orchestration for the Oven game server, with visual editing and per-node execution tracking.
> Last Updated: 2026-02-11

## Overview

The workflow system extends the event/wiring system with multi-step orchestration:
- **Wirings**: Simple 1:1 event → action mappings (EventBus)
- **Workflows**: State machine-based orchestration with branching, guards, and context accumulation

## Packages

| Package | Purpose |
|---------|---------|
| `@oven/module-workflows` | Schema, engine, node registry, API handlers, seed |
| `@oven/module-workflow-compiler` | Definition → TypeScript compiler (Handlebars templates) |

## Tables (5)

| Table | Purpose |
|-------|---------|
| `workflows` | Definition storage (XState JSON), slug, version, triggerEvent |
| `workflow_executions` | Execution history with status, context, timing |
| `node_executions` | Per-node tracking (input, output, duration, error) |
| `module_configs` | 3-tier config cascade (moduleName, scope, scopeId, key, value) |
| `workflow_versions` | Version history with full definition snapshots |

## Quick Start

```bash
pnpm db:push        # Apply schema
pnpm db:seed         # Seed 3 workflows + configs
pnpm --filter dashboard dev  # Start dashboard
```

Navigate to `/#/workflows` in the dashboard to view and manage workflows.

## Seeded Workflows

| Workflow | Slug | Purpose |
|----------|------|---------|
| Player Spawn | `player-spawn` | End old session → check last position → spawn at config or last pos → create session + assignment |
| Session End | `session-end` | Update session endedAt → update assignment position → emit event |
| Session Resume | `session-resume` | Check active session → extract context → get assignment |

## Documentation

- [Engine](engine.md) — Execution model, node types, transform language
- [API](api.md) — REST endpoints for workflows, executions, configs
- [Examples](examples.md) — Real workflow definitions with walkthrough
- [Editor](editor.md) — Visual builder documentation (planned)
