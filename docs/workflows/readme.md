# Workflow Engine

> Multi-step workflow orchestration for the Oven game server, with visual editing and per-node execution tracking.

## Overview

The workflow system extends the existing event/wiring system with **multi-step orchestration**:

```
Simple Wirings (existing):  Event → Single Action
Workflows (new):            Event → State Machine → Multiple Steps with Branching
```

Both systems coexist. Simple wirings handle 1:1 triggers. Workflows handle complex conditional logic.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Dashboard App                  │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ModuleManager│  │  Visual Workflow Editor   │  │
│  │(events/     │  │  (@oven/workflow-editor)  │  │
│  │ wirings)    │  │  ReactFlow canvas         │  │
│  └─────────────┘  └──────────────────────────┘  │
├─────────────────────────────────────────────────┤
│           @oven/module-workflows                │
│  Schema (4 tables) + XState Engine + Node       │
│  Registry (35+ API endpoints as nodes) + APIs   │
├─────────────────────────────────────────────────┤
│           @oven/module-registry                 │
│  EventBus + WiringRuntime (now with workflow    │
│  trigger support) + Module Registry             │
└─────────────────────────────────────────────────┘
```

## Packages

| Package | Purpose |
|---------|---------|
| `@oven/module-workflows` | DB schema, XState engine, node registry, CRUD APIs, React Admin components |
| `@oven/workflow-editor` | ReactFlow visual editor, custom nodes, palette, inspector, converters |

## Concepts

- **Workflow**: A reusable state machine definition stored as JSON. Can be triggered by events or executed manually.
- **Node**: A single step in a workflow (API call, condition check, data transform, event emit, delay).
- **Execution**: One run of a workflow, tracking overall status and per-node progress.
- **Config**: Module-level and per-instance settings that workflows can reference at runtime.

## Database Tables

| Table | Purpose |
|-------|---------|
| `workflows` | Workflow definitions (XState JSON, trigger event, version) |
| `workflow_executions` | Per-run tracking (status, context, snapshot) |
| `node_executions` | Per-node tracking (input, output, duration, errors) |
| `module_configs` | Configurable module settings with 3-tier resolution |

## Quick Start

1. Push DB schema: `pnpm --filter @oven/dashboard db:push`
2. Start dev: `pnpm --filter @oven/dashboard dev`
3. Navigate to `/#/workflows` to create a workflow
4. Click "Visual Editor" to open the drag-and-drop editor
5. Drag nodes from the palette, connect them, save
6. Click "Execute" to run the workflow
7. View execution at `/#/workflow-executions/:id/show`

## See Also

- [Engine Details](./engine.md) — XState integration, node types, persistence
- [Visual Editor](./editor.md) — ReactFlow editor, custom nodes, converters
- [API Reference](./api.md) — All workflow and config endpoints
- [Examples](./examples.md) — Sample workflows for common scenarios
