# Workflow Engine

> XState v5-based execution engine with per-node tracking and persistence.

## How It Works

1. A workflow definition (JSON) is loaded from the `workflows` table
2. The engine iterates through states sequentially
3. Each state with an `invoke` property executes a task (API call, event emit, etc.)
4. Results are merged into the execution context
5. Transitions determine the next state based on guards/conditions
6. Every node execution is logged to `node_executions` with timing and I/O

## Workflow Definition Format

```json
{
  "id": "player-onboarding",
  "initial": "start",
  "states": {
    "start": {
      "always": { "target": "createSession" }
    },
    "createSession": {
      "invoke": {
        "src": "sessions.create",
        "input": {
          "playerId": "$.playerId",
          "mapId": "$.mapId"
        },
        "onDone": { "target": "checkAssignment" },
        "onError": { "target": "failed" }
      }
    },
    "checkAssignment": {
      "always": [
        {
          "target": "positionPlayer",
          "guard": {
            "type": "condition",
            "params": { "key": "id", "operator": "exists" }
          }
        },
        { "target": "createAssignment" }
      ]
    },
    "createAssignment": {
      "invoke": {
        "src": "positions.assignments.create",
        "input": {
          "playerId": "$.playerId",
          "mapId": "$.mapId"
        },
        "onDone": { "target": "positionPlayer" }
      }
    },
    "positionPlayer": {
      "invoke": {
        "src": "core.emit",
        "input": {
          "event": "position.player.assigned",
          "payload": { "playerId": "$.playerId" }
        },
        "onDone": { "target": "done" }
      }
    },
    "done": { "type": "final" },
    "failed": { "type": "final" }
  }
}
```

## Node Types

### API Call Nodes
Execute module API endpoints via internal fetch. Node IDs follow the pattern `{module}.{resource}.{action}`.

35+ pre-registered nodes covering all existing endpoints:
- `maps.tiles.*`, `maps.worldConfigs.*`, `maps.maps.*`, `maps.chunks.*`, `maps.generate`
- `players.*`
- `sessions.*`, `sessions.getActive`
- `positions.assignments.*`, `positions.record`, `positions.visitedChunks.record`

### Utility Nodes
- `core.condition` — Branch based on context values
- `core.transform` — Reshape data using `$.path` expressions
- `core.delay` — Wait N milliseconds
- `core.emit` — Emit event on EventBus
- `core.log` — Log to console for debugging

## Transform Syntax

The `$.path` syntax resolves values from the execution context:

```json
{
  "playerId": "$.playerId",
  "sessionId": "$.createSession_output.id",
  "mapName": "$.mapData.name"
}
```

Each node's output is merged into context with key `{nodeId}_output`.

## Error Handling

- Each node catches errors independently
- Failed nodes are logged with error message and duration
- `onError` transitions allow graceful fallback paths
- If no `onError` is defined, the entire workflow fails

## Workflow Triggers

Workflows can be auto-triggered by events via the `triggerEvent` field.
The WiringRuntime checks for matching workflows after processing simple wirings:

```
Event fires → Simple wirings execute → Matching workflows start
```

## Execution Tracking

Every execution creates records in:
1. `workflow_executions` — Overall status, context snapshot, current state
2. `node_executions` — Per-node: status, input, output, duration, errors

Query executions via `GET /api/workflow-executions?workflowId=X&status=running`
