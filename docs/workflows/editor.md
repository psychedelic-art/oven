# Visual Workflow Editor

> Drag-and-drop workflow builder using ReactFlow with bidirectional XState conversion.

## Overview

The `@oven/workflow-editor` package provides a visual canvas for building workflows. Users drag nodes from a palette, connect them with edges, and the editor converts the graph to an XState-compatible JSON definition.

Route: `/#/workflows/:id/editor`

## Custom Node Types

| Node | Color | Handles | Purpose |
|------|-------|---------|---------|
| Trigger | Green | 1 output | Entry point, auto-transitions to first connected node |
| API Call | Blue | 1 input, 1 output, 1 error | Calls a module API endpoint |
| Condition | Orange | 1 input, true/false outputs | Branches based on context values |
| Transform | Purple | 1 input, 1 output | Reshapes data between nodes |
| Event Emit | Pink | 1 input, 1 output | Emits an event on EventBus |
| Delay | Gray | 1 input, 1 output | Waits N milliseconds |
| End | Red circle | 1 input | Terminal state |

## Layout

```
┌──────────┬────────────────────────┬──────────┐
│  Node    │                        │  Node    │
│  Palette │   ReactFlow Canvas     │ Inspector│
│  (left)  │                        │  (right) │
│          │  [nodes + edges]       │          │
│  Search  │                        │  Props   │
│  Groups  │  Toolbar: Save/Execute │  Editor  │
└──────────┴────────────────────────┴──────────┘
```

## Node Palette

Left sidebar showing all available nodes grouped by module:
- **Quick Add**: Trigger, Condition, Delay, End (drag chips)
- **Module Groups**: Expandable accordions with all API endpoint nodes
- **Search**: Filter nodes by name or ID

## Node Inspector

Right panel that appears when a node is selected:
- **API Call**: Node type ID selector, input mapping (JSON with $.path)
- **Condition**: Key, operator (==, !=, >, <, contains, exists), value
- **Transform**: Mapping editor (JSON)
- **Event Emit**: Event name, payload (JSON)
- **Delay**: Milliseconds input

## Bidirectional Conversion

### ReactFlow → XState (`reactflow-to-xstate.ts`)
- Nodes become XState states
- Edges become transitions
- Condition nodes with true/false handles become guarded `always` transitions
- API Call nodes become `invoke` states with `onDone`/`onError`

### XState → ReactFlow (`xstate-to-reactflow.ts`)
- States become positioned nodes
- Transitions become edges
- `invoke.src` determines node type (api-call, core.transform, etc.)
- Guards on `always` transitions create condition nodes

## Execution Overlay

When viewing an execution, nodes are styled based on status:
- Green glow: completed
- Yellow pulse: running
- Red glow: failed
- Dimmed: skipped/pending
